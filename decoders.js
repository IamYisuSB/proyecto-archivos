/* Lectura de formatos que el navegador no abre por sí mismo: HEIC/HEIF,
 * TIFF y RAW de cámara. Cada decodificador devuelve un Blob PNG/JPEG
 * que ya se puede cargar en un <img>. Las librerías externas se descargan
 * solo la primera vez que se necesitan. */
(function (global) {
  'use strict';

  const CDN = {
    heic2any: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
    pako: 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js',
    utif: 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js',
  };
  // Huellas de las versiones exactas: si el CDN sirviera otra cosa, se rechaza
  const SRI = {
    heic2any: 'sha384-OTofQ0MEeiSgh62havBcemCIK0gqj809wX6UA0uPISNMRnR6NZyCdGzX3SbLrgwL',
    pako: 'sha384-rNlaE5fs9dGIjmxWDALQh/RBAaGRYT5ChrzHo6tRfgrZ36iRFAiquP5g41Jsv+0j',
    utif: 'sha384-RyBmXHdfZ/Uon+ud+/AqSyWpUWnKYt2tkRG/P4gWoRUGDU+qIAV3tGBPNlYTBZEF',
  };

  const LABELS = { heic: 'HEIC', tiff: 'TIFF', raw: 'RAW' };

  const RAW_EXT = /\.(cr2|cr3|crw|nef|nrw|arw|srf|sr2|dng|orf|rw2|raf|pef|srw|x3f|3fr|erf|kdc|mrw|mos|rwl|iiq|raw)$/i;

  function kindOf(file) {
    const n = file.name, t = file.type;
    if (/\.(heic|heif)$/i.test(n) || /image\/hei[cf]/.test(t)) return 'heic';
    if (/\.tiff?$/i.test(n) || t === 'image/tiff') return 'tiff';
    if (RAW_EXT.test(n)) return 'raw';
    return null;
  }

  const scripts = {};
  function loadScript(url, integrity) {
    if (!scripts[url]) {
      scripts[url] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.integrity = integrity;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = res;
        s.onerror = () => { delete scripts[url]; s.remove(); rej(new Error('No se pudo descargar ' + url)); };
        document.head.appendChild(s);
      });
    }
    return scripts[url];
  }

  function rgbaToPNG(rgba, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, w * h * 4), w, h), 0, 0);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  /* ---------- HEIC / HEIF ---------- */

  /* Descarga un archivo y comprueba que su huella SHA-384 es la esperada. */
  async function fetchVerified(url, integrity) {
    let res;
    try { res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' }); } catch (_) { res = null; }
    if (!res || !res.ok) throw new Error('No se pudo descargar ' + url);
    const buf = await res.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-384', buf));
    let bin = '';
    digest.forEach((b) => { bin += String.fromCharCode(b); });
    if ('sha384-' + btoa(bin) !== integrity) throw new Error('La librería descargada no coincide con la esperada: ' + url);
    return new TextDecoder().decode(buf);
  }

  /* heic2any necesita "new Function", que la página prohíbe por seguridad. Por
   * eso se ejecuta en un iframe aislado (heic-sandbox.html) sin acceso a la
   * página ni a internet; se le pasa el código ya verificado y la foto. */
  let heicFrame = null;

  function waitMessage(iframe, match, ms, timeoutMsg) {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { window.removeEventListener('message', on); rej(new Error(timeoutMsg)); }, ms);
      function on(e) {
        if (e.source !== iframe.contentWindow || !e.data || !match(e.data)) return;
        clearTimeout(timer);
        window.removeEventListener('message', on);
        res(e.data);
      }
      window.addEventListener('message', on);
    });
  }

  function heicSandbox() {
    if (heicFrame) return heicFrame;
    heicFrame = (async () => {
      const code = await fetchVerified(CDN.heic2any, SRI.heic2any);
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.tabIndex = -1;
      iframe.hidden = true;
      iframe.src = 'heic-sandbox.html';
      const hello = waitMessage(iframe, (d) => d.type === 'hello', 15000, 'El decodificador HEIC no arranca');
      document.body.appendChild(iframe);
      try {
        await hello;
        const lib = waitMessage(iframe, (d) => d.type === 'lib', 30000, 'El decodificador HEIC no arranca');
        iframe.contentWindow.postMessage({ type: 'lib', code }, '*');
        if (!(await lib).ok) throw new Error('No se pudo iniciar el decodificador HEIC');
      } catch (e) {
        iframe.remove();
        throw e;
      }
      return iframe;
    })();
    heicFrame.catch(() => { heicFrame = null; });
    return heicFrame;
  }

  let heicSeq = 0;
  async function decodeHEIC(file) {
    const iframe = await heicSandbox();
    const id = ++heicSeq;
    const answer = waitMessage(iframe, (d) => d.type === 'decoded' && d.id === id, 90000, 'El decodificador HEIC tardó demasiado');
    iframe.contentWindow.postMessage({ type: 'decode', id, blob: file }, '*');
    const d = await answer;
    if (!d.ok || !(d.blob instanceof Blob)) throw new Error(d.msg || 'No se pudo decodificar el HEIC');
    return d.blob;
  }

  /* ---------- TIFF (primera página) ---------- */

  async function decodeTIFF(file) {
    await loadScript(CDN.pako, SRI.pako); // UTIF lo necesita para TIFF con compresión Deflate
    await loadScript(CDN.utif, SRI.utif);
    const UTIF = global.UTIF;
    const buf = await file.arrayBuffer();
    const ifds = UTIF.decode(buf).filter((i) => i.t256 && i.t257);
    if (!ifds.length) throw new Error('TIFF sin imágenes');
    const page = ifds[0];
    UTIF.decodeImage(buf, page, ifds);
    const rgba = UTIF.toRGBA8(page);
    return rgbaToPNG(rgba, page.width, page.height);
  }

  /* ---------- RAW de cámara: vista previa JPEG incrustada ---------- */

  /* Orientación (etiqueta 274) del IFD0 en RAW con estructura TIFF. */
  function tiffOrientation(u8) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const bo = v.getUint16(0);
    if (bo !== 0x4949 && bo !== 0x4d4d) return 1;
    const le = bo === 0x4949;
    const ifd = v.getUint32(4, le);
    if (ifd + 2 > u8.length) return 1;
    const count = v.getUint16(ifd, le);
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > u8.length) break;
      if (v.getUint16(e, le) === 274) return v.getUint16(e + 8, le);
    }
    return 1;
  }

  function hasExif(u8, start) {
    // APP1 "Exif" justo después del SOI
    return u8[start + 3] === 0xe1 && u8[start + 6] === 0x45 && u8[start + 7] === 0x78 && u8[start + 8] === 0x69 && u8[start + 9] === 0x66;
  }

  async function rotate(blob, orientation) {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'none' });
    const swap = orientation >= 5;
    const c = document.createElement('canvas');
    c.width = swap ? bmp.height : bmp.width;
    c.height = swap ? bmp.width : bmp.height;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const m = {
      2: [-1, 0, 0, 1, W, 0], 3: [-1, 0, 0, -1, W, H], 4: [1, 0, 0, -1, 0, H],
      5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, W, 0], 7: [0, -1, -1, 0, W, H], 8: [0, -1, 1, 0, 0, H],
    }[orientation];
    if (m) g.setTransform(...m);
    g.drawImage(bmp, 0, 0);
    bmp.close();
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.95));
  }

  async function decodeRAW(file) {
    const u8 = new Uint8Array(await file.arrayBuffer());
    const starts = [];
    for (let i = 0; i < u8.length - 3 && starts.length < 24; i++) {
      if (u8[i] === 0xff && u8[i + 1] === 0xd8 && u8[i + 2] === 0xff && u8[i + 3] >= 0xc0) starts.push(i);
    }
    // Cada RAW trae varias vistas previas de distinto tamaño: nos quedamos con la mayor.
    // El decodificador JPEG del navegador ignora los bytes sobrantes tras el final.
    let best = null;
    for (const s of starts) {
      const blob = file.slice(s, file.size, 'image/jpeg'); // sin copiar bytes
      try {
        const bmp = await createImageBitmap(blob);
        const area = bmp.width * bmp.height;
        bmp.close();
        if (!best || area > best.area) best = { blob, area, start: s };
      } catch (_) { /* no era un JPEG decodificable (p. ej. JPEG sin pérdida) */ }
    }
    if (!best) throw new Error('Este RAW no trae una vista previa legible');
    const orientation = tiffOrientation(u8);
    if (orientation > 1 && !hasExif(u8, best.start)) return rotate(best.blob, orientation);
    return best.blob;
  }

  const DECODERS = { heic: decodeHEIC, tiff: decodeTIFF, raw: decodeRAW };

  function decode(file, kind) {
    return DECODERS[kind](file);
  }

  global.Codecs = { kindOf, decode, loadScript, LABELS, RAW_EXT, CDN_FILES: Object.values(CDN) };
})(window);
