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
  function loadScript(url) {
    if (!scripts[url]) {
      scripts[url] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = url;
        s.async = true;
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

  async function decodeHEIC(file) {
    await loadScript(CDN.heic2any);
    const out = await global.heic2any({ blob: file, toType: 'image/png' });
    return Array.isArray(out) ? out[0] : out;
  }

  /* ---------- TIFF (primera página) ---------- */

  async function decodeTIFF(file) {
    await loadScript(CDN.pako); // UTIF lo necesita para TIFF con compresión Deflate
    await loadScript(CDN.utif);
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

  global.Codecs = { kindOf, decode, loadScript, LABELS, RAW_EXT };
})(window);
