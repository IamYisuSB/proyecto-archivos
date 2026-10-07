/* Codificadores que el navegador no trae de serie (BMP, TIFF, ICO, GIF, PDF,
 * PNG optimizado), generador de ZIP, metadatos EXIF y códecs WebAssembly
 * (AVIF y MozJPEG).
 *
 * Todo vive dentro de PixeloteEncoders() para poder ejecutarlo tal cual en un
 * Web Worker: el Worker recibe el código fuente de esta función. Por eso no
 * puede depender de nada de fuera de ella. */
function PixeloteEncoders(global) {
  'use strict';

  const inWorker = typeof document === 'undefined';

  /* ---------- Lienzos que funcionan dentro y fuera de un Worker ---------- */

  const offscreen = (() => {
    try { return typeof OffscreenCanvas !== 'undefined' && !!new OffscreenCanvas(1, 1).getContext('2d'); } catch (_) { return false; }
  })();

  function makeCanvas(w, h) {
    if (offscreen) return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* Codifica un lienzo; falla si el navegador devuelve otro formato (lo hace en silencio). */
  async function canvasToBlob(canvas, type, quality) {
    const blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type, quality })
      : await new Promise((res) => canvas.toBlob(res, type, quality));
    if (!blob || blob.type !== type) throw new Error('Formato no disponible aquí: ' + type);
    return blob;
  }

  /* BMP de 24 bits, sin compresión. La imagen debe llegar ya opaca. */
  function encodeBMP(imageData) {
    const { width: w, height: h, data } = imageData;
    const rowSize = Math.ceil((w * 3) / 4) * 4;
    const pixelBytes = rowSize * h;
    const buf = new ArrayBuffer(54 + pixelBytes);
    const v = new DataView(buf);
    const u8 = new Uint8Array(buf);

    v.setUint8(0, 0x42); v.setUint8(1, 0x4d); // "BM"
    v.setUint32(2, buf.byteLength, true);
    v.setUint32(10, 54, true);
    v.setUint32(14, 40, true);
    v.setInt32(18, w, true);
    v.setInt32(22, h, true); // positivo = filas de abajo arriba
    v.setUint16(26, 1, true);
    v.setUint16(28, 24, true);
    v.setUint32(34, pixelBytes, true);
    v.setInt32(38, 2835, true); // 72 ppp
    v.setInt32(42, 2835, true);

    for (let y = 0; y < h; y++) {
      let o = 54 + (h - 1 - y) * rowSize;
      let i = y * w * 4;
      for (let x = 0; x < w; x++, i += 4) {
        u8[o++] = data[i + 2];
        u8[o++] = data[i + 1];
        u8[o++] = data[i];
      }
    }
    return new Blob([buf], { type: 'image/bmp' });
  }

  /* TIFF RGBA sin compresión, en una sola tira. */
  function encodeTIFF(imageData) {
    const { width: w, height: h, data } = imageData;
    const entries = 14;
    const ifdOffset = 8;
    const ifdSize = 2 + entries * 12 + 4;
    const bpsOffset = ifdOffset + ifdSize;
    const xResOffset = bpsOffset + 8;
    const yResOffset = xResOffset + 8;
    const dataOffset = yResOffset + 8;
    const dataSize = w * h * 4;

    const buf = new ArrayBuffer(dataOffset + dataSize);
    const v = new DataView(buf);
    v.setUint16(0, 0x4949, true); // "II" little-endian
    v.setUint16(2, 42, true);
    v.setUint32(4, ifdOffset, true);
    v.setUint16(ifdOffset, entries, true);

    let p = ifdOffset + 2;
    const SHORT = 3, LONG = 4, RATIONAL = 5;
    function tag(id, type, count, value) {
      v.setUint16(p, id, true);
      v.setUint16(p + 2, type, true);
      v.setUint32(p + 4, count, true);
      if (type === SHORT && count === 1) v.setUint16(p + 8, value, true);
      else v.setUint32(p + 8, value, true);
      p += 12;
    }
    tag(256, LONG, 1, w);              // ImageWidth
    tag(257, LONG, 1, h);              // ImageLength
    tag(258, SHORT, 4, bpsOffset);     // BitsPerSample
    tag(259, SHORT, 1, 1);             // Compression: ninguna
    tag(262, SHORT, 1, 2);             // Photometric: RGB
    tag(273, LONG, 1, dataOffset);     // StripOffsets
    tag(277, SHORT, 1, 4);             // SamplesPerPixel
    tag(278, LONG, 1, h);              // RowsPerStrip
    tag(279, LONG, 1, dataSize);       // StripByteCounts
    tag(282, RATIONAL, 1, xResOffset); // XResolution
    tag(283, RATIONAL, 1, yResOffset); // YResolution
    tag(284, SHORT, 1, 1);             // PlanarConfiguration
    tag(296, SHORT, 1, 2);             // ResolutionUnit: pulgadas
    tag(338, SHORT, 1, 2);             // ExtraSamples: alfa no asociado
    v.setUint32(p, 0, true);           // no hay más IFD

    for (let i = 0; i < 4; i++) v.setUint16(bpsOffset + i * 2, 8, true);
    v.setUint32(xResOffset, 72, true); v.setUint32(xResOffset + 4, 1, true);
    v.setUint32(yResOffset, 72, true); v.setUint32(yResOffset + 4, 1, true);

    new Uint8Array(buf, dataOffset).set(data);
    return new Blob([buf], { type: 'image/tiff' });
  }

  /* ICO con varios tamaños (16–256 px) en PNG. Imágenes no cuadradas se
   * centran sobre fondo transparente. */
  async function encodeICO(canvas) {
    const side = Math.max(canvas.width, canvas.height);
    const sizes = [16, 24, 32, 48, 64, 128, 256].filter((s) => s <= Math.max(side, 16));
    const pngs = [];
    for (const s of sizes) {
      const c = makeCanvas(s, s);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      const scale = s / side;
      const dw = Math.round(canvas.width * scale);
      const dh = Math.round(canvas.height * scale);
      g.drawImage(canvas, Math.round((s - dw) / 2), Math.round((s - dh) / 2), dw, dh);
      const blob = await canvasToBlob(c, 'image/png');
      pngs.push({ s, bytes: new Uint8Array(await blob.arrayBuffer()) });
    }

    const headerSize = 6 + 16 * pngs.length;
    const total = headerSize + pngs.reduce((a, p) => a + p.bytes.length, 0);
    const buf = new ArrayBuffer(total);
    const v = new DataView(buf);
    const u8 = new Uint8Array(buf);
    v.setUint16(2, 1, true); // tipo icono
    v.setUint16(4, pngs.length, true);
    let offset = headerSize;
    pngs.forEach((p, i) => {
      const e = 6 + i * 16;
      v.setUint8(e, p.s >= 256 ? 0 : p.s);
      v.setUint8(e + 1, p.s >= 256 ? 0 : p.s);
      v.setUint16(e + 4, 1, true);
      v.setUint16(e + 6, 32, true);
      v.setUint32(e + 8, p.bytes.length, true);
      v.setUint32(e + 12, offset, true);
      u8.set(p.bytes, offset);
      offset += p.bytes.length;
    });
    return new Blob([buf], { type: 'image/x-icon' });
  }

  /* ZIP "store" (sin compresión: las imágenes ya vienen comprimidas). */
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async function makeZip(files) {
    const enc = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    const parts = [];
    const central = [];
    let offset = 0;

    for (const f of files) {
      const name = enc.encode(f.name);
      const bytes = new Uint8Array(await f.blob.arrayBuffer());
      const crc = crc32(bytes);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // nombres en UTF-8
      local.setUint16(10, dosTime, true);
      local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, bytes.length, true);
      local.setUint32(22, bytes.length, true);
      local.setUint16(26, name.length, true);
      parts.push(local.buffer, name, bytes);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint16(12, dosTime, true);
      cd.setUint16(14, dosDate, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, bytes.length, true);
      cd.setUint32(24, bytes.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(cd.buffer, name);

      offset += 30 + name.length + bytes.length;
    }

    const cdSize = central.reduce((a, b) => a + b.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }

  /* ---------- GIF (estático, 256 colores) ---------- */

  /* Corte de mediana genérico: `samples` son tuplas de `ch` canales seguidas. */
  function medianCutN(samples, ch, maxColors) {
    const count = samples.length / ch;
    const s = Uint8Array.from(samples);
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;

    function stats(box) {
      const lo = new Array(ch).fill(255), hi = new Array(ch).fill(0);
      for (let i = box.start; i < box.end; i++) {
        const o = idx[i] * ch;
        for (let c = 0; c < ch; c++) {
          const x = s[o + c];
          if (x < lo[c]) lo[c] = x;
          if (x > hi[c]) hi[c] = x;
        }
      }
      let best = 0;
      for (let c = 1; c < ch; c++) if (hi[c] - lo[c] > hi[best] - lo[best]) best = c;
      box.channel = best;
      box.range = hi[best] - lo[best];
      return box;
    }

    const boxes = [stats({ start: 0, end: count })];
    while (boxes.length < maxColors) {
      let pick = -1, score = 0;
      boxes.forEach((b, i) => {
        const sc = b.range * (b.end - b.start);
        if (b.end - b.start > 1 && b.range > 0 && sc > score) { score = sc; pick = i; }
      });
      if (pick < 0) break;
      const b = boxes[pick];
      const c = b.channel;
      idx.subarray(b.start, b.end).sort((x, y) => s[x * ch + c] - s[y * ch + c]);
      const mid = (b.start + b.end) >> 1;
      boxes.splice(pick, 1, stats({ start: b.start, end: mid }), stats({ start: mid, end: b.end }));
    }

    return boxes.map((b) => {
      const sum = new Array(ch).fill(0);
      for (let i = b.start; i < b.end; i++) {
        const o = idx[i] * ch;
        for (let c = 0; c < ch; c++) sum[c] += s[o + c];
      }
      return sum.map((v) => Math.round(v / (b.end - b.start)));
    });
  }

  /* Paleta RGB para GIF a partir de una muestra de píxeles opacos. */
  function medianCut(data, maxColors) {
    const total = data.length / 4;
    const step = Math.max(1, Math.floor(total / 120000));
    const samples = [];
    for (let i = 0; i < total; i += step) {
      const o = i * 4;
      if (data[o + 3] >= 128) samples.push(data[o], data[o + 1], data[o + 2]);
    }
    if (!samples.length) return [[0, 0, 0]];
    return medianCutN(samples, 3, maxColors);
  }

  function lzwEncode(indices, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    const out = [];
    let cur = 0, bits = 0;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    // Diccionario (prefijo, índice) → código, invalidado por "generación" en cada reinicio
    const table = new Int16Array(4096 * 256);
    const gen = new Uint32Array(4096 * 256);
    let generation = 1;

    function emit(code) {
      cur |= code << bits;
      bits += codeSize;
      while (bits >= 8) { out.push(cur & 0xff); cur >>>= 8; bits -= 8; }
    }

    emit(clearCode);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      if (gen[key] === generation) {
        prefix = table[key];
        continue;
      }
      emit(prefix);
      if (nextCode === 4096) {
        emit(clearCode);
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
        generation++;
      } else {
        if (nextCode >= 1 << codeSize) codeSize++;
        table[key] = nextCode++;
        gen[key] = generation;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoiCode);
    if (bits > 0) out.push(cur & 0xff);
    return out;
  }

  function encodeGIF(imageData) {
    const { width: w, height: h, data } = imageData;
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) { transparent = true; break; }

    const palette = medianCut(data, transparent ? 255 : 256);
    const transIndex = transparent ? palette.length : -1;

    // Cada color (reducido a 15 bits) se busca una sola vez en la paleta
    const cache = new Int16Array(32768).fill(-1);
    const indices = new Uint8Array(w * h);
    for (let i = 0, o = 0; i < indices.length; i++, o += 4) {
      if (transparent && data[o + 3] < 128) { indices[i] = transIndex; continue; }
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let best = cache[key];
      if (best < 0) {
        let bestD = Infinity;
        for (let p = 0; p < palette.length; p++) {
          const c = palette[p];
          const d = (c[0] - r) * (c[0] - r) * 2 + (c[1] - g) * (c[1] - g) * 4 + (c[2] - b) * (c[2] - b) * 3;
          if (d < bestD) { bestD = d; best = p; }
        }
        cache[key] = best;
      }
      indices[i] = best;
    }

    const bytes = [];
    const u16 = (n) => bytes.push(n & 0xff, (n >> 8) & 0xff);
    for (const ch of 'GIF89a') bytes.push(ch.charCodeAt(0));
    u16(w); u16(h);
    bytes.push(0xf7, 0, 0); // tabla global de 256 colores
    for (let p = 0; p < 256; p++) {
      const c = palette[p] || [0, 0, 0];
      bytes.push(c[0], c[1], c[2]);
    }
    if (transparent) bytes.push(0x21, 0xf9, 4, 0x01, 0, 0, transIndex, 0);
    bytes.push(0x2c); u16(0); u16(0); u16(w); u16(h); bytes.push(0);
    bytes.push(8);
    const lzw = lzwEncode(indices, 8);
    for (let i = 0; i < lzw.length; i += 255) {
      const chunk = lzw.slice(i, i + 255);
      bytes.push(chunk.length);
      for (let j = 0; j < chunk.length; j++) bytes.push(chunk[j]);
    }
    bytes.push(0, 0x3b);
    return new Blob([Uint8Array.from(bytes)], { type: 'image/gif' });
  }

  /* ---------- PDF (una imagen JPEG por página) ---------- */

  const A4 = [595.28, 841.89];

  /* pages: [{ jpeg: Blob, w, h }] · mode: 'fit' (página del tamaño de la imagen) o 'a4' */
  async function makePDF(pages, mode) {
    const enc = new TextEncoder();
    const parts = [];
    const offsets = [];
    let pos = 0;
    const push = (x) => {
      const b = typeof x === 'string' ? enc.encode(x) : x;
      parts.push(b);
      pos += b.length;
    };
    const f = (n) => +n.toFixed(2);

    push('%PDF-1.4\n%âãÏÓ\n');
    const nObjects = 2 + pages.length * 3;
    const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');

    offsets[1] = pos; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offsets[2] = pos; push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

    for (let i = 0; i < pages.length; i++) {
      const { jpeg, w, h } = pages[i];
      const pageN = 3 + i * 3, contentN = pageN + 1, imageN = pageN + 2;
      const iw = w * 0.75, ih = h * 0.75; // 96 ppp → puntos
      let pw, ph, dw, dh, x, y;
      if (mode === 'a4') {
        [pw, ph] = w > h ? [A4[1], A4[0]] : A4;
        const margin = 36;
        const k = Math.min((pw - margin * 2) / iw, (ph - margin * 2) / ih);
        dw = iw * k; dh = ih * k;
        x = (pw - dw) / 2; y = (ph - dh) / 2;
      } else {
        pw = dw = iw; ph = dh = ih; x = y = 0;
      }

      offsets[pageN] = pos;
      push(`${pageN} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] ` +
        `/Resources << /XObject << /Im0 ${imageN} 0 R >> >> /Contents ${contentN} 0 R >>\nendobj\n`);

      const content = `q ${f(dw)} 0 0 ${f(dh)} ${f(x)} ${f(y)} cm /Im0 Do Q`;
      offsets[contentN] = pos;
      push(`${contentN} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

      const bytes = new Uint8Array(await jpeg.arrayBuffer());
      offsets[imageN] = pos;
      push(`${imageN} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
      push(bytes);
      push('\nendstream\nendobj\n');
    }

    const xref = pos;
    let table = `xref\n0 ${nObjects + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= nObjects; n++) table += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    push(table);
    push(`trailer\n<< /Size ${nObjects + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  /* ---------- Códecs WebAssembly: AVIF y MozJPEG ---------- */

  const WASM = {
    avif: {
      url: 'https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/codec/enc/avif_enc.js',
      mime: 'image/avif',
      // speed 8: ~8 veces más rápido que el valor por defecto (6) con poca pérdida de compresión
      options: (q) => ({
        quality: Math.round(q * 100), qualityAlpha: -1, denoiseLevel: 0,
        tileColsLog2: 0, tileRowsLog2: 0, speed: 8, subsample: 1, chromaDeltaQ: false,
        sharpness: 0, tune: 0, enableSharpYUV: false, bitDepth: 8, lossless: false,
      }),
    },
    mozjpeg: {
      url: 'https://cdn.jsdelivr.net/npm/@jsquash/jpeg@1.6.0/codec/enc/mozjpeg_enc.js',
      mime: 'image/jpeg',
      clamped: true, // este códec espera Uint8ClampedArray
      options: (q) => ({
        quality: Math.round(q * 100), baseline: false, arithmetic: false, progressive: true,
        optimize_coding: true, smoothing: 0, color_space: 3, quant_table: 3,
        trellis_multipass: false, trellis_opt_zero: false, trellis_opt_table: false, trellis_loops: 1,
        auto_subsample: true, chroma_subsample: 2, separate_chroma_quality: false, chroma_quality: 75,
      }),
    },
  };

  /* Carga y uso directo del códec en el hilo actual. */
  const direct = {};
  async function wasmDirect(codec, imageData, options) {
    if (!direct[codec]) {
      direct[codec] = import(WASM[codec].url).then((m) => m.default({ noInitialRun: true }));
      direct[codec].catch(() => { delete direct[codec]; });
    }
    const mod = await direct[codec];
    const d = imageData.data;
    const input = WASM[codec].clamped ? d : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    const out = mod.encode(input, imageData.width, imageData.height, options);
    if (!out) throw new Error('Error al codificar');
    return out.slice();
  }

  /* Fuera de un Worker, el códec se ejecuta en uno propio para no congelar la
   * página. Es un Worker clásico con import() dinámico porque los Worker de
   * módulo no arrancan desde file://. */
  const CODEC_WORKER_SRC = `
    const URLS = ${JSON.stringify({ avif: WASM.avif.url, mozjpeg: WASM.mozjpeg.url })};
    const mods = {};
    self.onmessage = async (e) => {
      const { codec, data, width, height, options } = e.data;
      try {
        if (!mods[codec]) mods[codec] = import(URLS[codec]).then((m) => m.default({ noInitialRun: true }));
        let mod;
        try { mod = await mods[codec]; } catch (err) { delete mods[codec]; throw err; }
        const input = codec === 'mozjpeg' ? new Uint8ClampedArray(data) : new Uint8Array(data);
        const out = mod.encode(input, width, height, options);
        if (!out) throw new Error('Error al codificar');
        const copy = out.slice();
        self.postMessage({ ok: true, buf: copy.buffer }, [copy.buffer]);
      } catch (err) {
        self.postMessage({ ok: false, msg: String((err && err.message) || err) });
      }
    };`;

  let codecWorker = null; // false = este navegador no deja crearlo
  let codecQueue = Promise.resolve();

  function wasmViaWorker(codec, imageData, options) {
    if (!codecWorker) {
      codecWorker = new Worker(URL.createObjectURL(new Blob([CODEC_WORKER_SRC], { type: 'text/javascript' })));
    }
    return new Promise((res, rej) => {
      const w = codecWorker;
      w.onmessage = (e) => (e.data.ok ? res(new Uint8Array(e.data.buf)) : rej(new Error(e.data.msg)));
      w.onerror = (e) => { e.preventDefault(); rej(new Error('worker')); };
      const copy = imageData.data.slice();
      w.postMessage({ codec, data: copy.buffer, width: imageData.width, height: imageData.height, options }, [copy.buffer]);
    });
  }

  function wasmEncode(codec, imageData, quality) {
    const options = WASM[codec].options(quality);
    const type = WASM[codec].mime;
    if (inWorker) return wasmDirect(codec, imageData, options).then((out) => new Blob([out], { type }));
    const job = codecQueue.then(async () => {
      let out;
      if (codecWorker !== false) {
        try {
          out = await wasmViaWorker(codec, imageData, options);
        } catch (e) {
          if (e.message !== 'worker') throw e;
          if (codecWorker) codecWorker.terminate();
          codecWorker = false; // el Worker no arranca aquí: se usa el hilo principal
        }
      }
      if (!out) out = await wasmDirect(codec, imageData, options);
      return new Blob([out], { type });
    });
    codecQueue = job.catch(() => {});
    return job;
  }

  /* ---------- PNG optimizado: paleta de hasta 256 colores (como TinyPNG) ---------- */

  const PNG_SIG = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

  function pngChunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }

  async function zlib(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* Paleta RGBA: corte de mediana sobre los píxeles visibles, más una entrada
   * totalmente transparente si hace falta. Ordenada por alfa para que tRNS sea corto. */
  function quantizeRGBA(data, maxColors) {
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) { transparent = true; break; }
    const total = data.length / 4;
    const step = Math.max(1, Math.floor(total / 150000));
    const samples = [];
    for (let i = 0; i < total; i += step) {
      const o = i * 4;
      if (data[o + 3] > 0) samples.push(data[o], data[o + 1], data[o + 2], data[o + 3]);
    }
    const palette = samples.length ? medianCutN(samples, 4, Math.max(1, transparent ? maxColors - 1 : maxColors)) : [];
    if (transparent || !palette.length) palette.push([0, 0, 0, 0]);
    return palette.sort((a, b) => a[3] - b[3]);
  }

  /* Asigna cada píxel a la paleta con tramado Floyd–Steinberg suave. */
  function mapPalette(imageData, palette) {
    const { width: w, height: h, data } = imageData;
    const n = palette.length;
    const P = new Int32Array(n * 4);
    palette.forEach((c, i) => P.set(c, i * 4));
    const transparentIdx = palette.findIndex((c) => c[3] === 0);
    const out = new Uint8Array(w * h);
    const cache = new Int16Array(1 << 19).fill(-1);
    const STRENGTH = 0.85;
    let cur = new Float32Array((w + 2) * 4);
    let next = new Float32Array((w + 2) * 4);
    const clamp = (x) => (x < 0 ? 0 : x > 255 ? 255 : x | 0);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const e = (x + 1) * 4;
        if (data[o + 3] === 0 && transparentIdx >= 0) { out[y * w + x] = transparentIdx; continue; }
        const r = clamp(data[o] + cur[e]);
        const g = clamp(data[o + 1] + cur[e + 1]);
        const b = clamp(data[o + 2] + cur[e + 2]);
        const a = clamp(data[o + 3] + cur[e + 3]);
        const key = ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4);
        let best = cache[key];
        if (best < 0) {
          let bestD = Infinity;
          for (let p = 0; p < n; p++) {
            const q = p * 4;
            const dr = P[q] - r, dg = P[q + 1] - g, db = P[q + 2] - b, da = P[q + 3] - a;
            const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db + 4 * da * da;
            if (d < bestD) { bestD = d; best = p; }
          }
          cache[key] = best;
        }
        out[y * w + x] = best;
        const q = best * 4;
        for (let c = 0; c < 4; c++) {
          const err = ((c === 0 ? r : c === 1 ? g : c === 2 ? b : a) - P[q + c]) * STRENGTH;
          if (!err) continue;
          cur[e + 4 + c] += err * 7 / 16;
          next[e - 4 + c] += err * 3 / 16;
          next[e + c] += err * 5 / 16;
          next[e + 4 + c] += err / 16;
        }
      }
      const t = cur; cur = next; next = t;
      next.fill(0);
    }
    return out;
  }

  async function encodePNG8(imageData, maxColors) {
    const { width: w, height: h } = imageData;
    const palette = quantizeRGBA(imageData.data, Math.max(2, Math.min(256, maxColors)));
    const idx = mapPalette(imageData, palette);
    const n = palette.length;
    const depth = n <= 2 ? 1 : n <= 4 ? 2 : n <= 16 ? 4 : 8;
    const rowBytes = Math.ceil((w * depth) / 8);
    const raw = new Uint8Array(h * (rowBytes + 1)); // filtro 0 en cada fila (lo recomendado con paleta)
    for (let y = 0; y < h; y++) {
      const o = y * (rowBytes + 1) + 1;
      if (depth === 8) {
        raw.set(idx.subarray(y * w, (y + 1) * w), o);
      } else {
        const per = 8 / depth;
        for (let x = 0; x < w; x++) raw[o + ((x / per) | 0)] |= idx[y * w + x] << (8 - depth * ((x % per) + 1));
      }
    }

    const ihdr = new Uint8Array(13);
    const v = new DataView(ihdr.buffer);
    v.setUint32(0, w); v.setUint32(4, h);
    ihdr[8] = depth; ihdr[9] = 3; // color indexado
    const plte = new Uint8Array(n * 3);
    palette.forEach((c, i) => plte.set(c.slice(0, 3), i * 3));
    const translucent = palette.filter((c) => c[3] < 255).length;

    const parts = [PNG_SIG, pngChunk('IHDR', ihdr), pngChunk('PLTE', plte)];
    if (translucent) parts.push(pngChunk('tRNS', Uint8Array.from(palette.slice(0, translucent).map((c) => c[3]))));
    parts.push(pngChunk('IDAT', await zlib(raw)), pngChunk('IEND', new Uint8Array(0)));
    return new Blob(parts, { type: 'image/png' });
  }

  /* ---------- Metadatos EXIF ---------- */

  /* Bloque TIFF del EXIF de un JPEG (lo que va tras "Exif\0\0"), o null. */
  function readJpegExif(buf) {
    const u8 = new Uint8Array(buf);
    if (u8[0] !== 0xff || u8[1] !== 0xd8) return null;
    let p = 2;
    while (p + 4 <= u8.length) {
      if (u8[p] !== 0xff) return null;
      const marker = u8[p + 1];
      if (marker === 0xff) { p++; continue; }
      if (marker === 0xda || marker === 0xd9) return null; // empiezan los datos de imagen
      const len = (u8[p + 2] << 8) | u8[p + 3];
      if (p + 2 + len > u8.length) return null;
      if (marker === 0xe1 && len > 8 && u8[p + 4] === 0x45 && u8[p + 5] === 0x78 && u8[p + 6] === 0x69 &&
          u8[p + 7] === 0x66 && u8[p + 8] === 0 && u8[p + 9] === 0) {
        return u8.slice(p + 10, p + 2 + len);
      }
      p += 2 + len;
    }
    return null;
  }

  const TYPE_SIZE = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

  function tiffInfo(t) {
    if (!t || t.length < 8) return null;
    const v = new DataView(t.buffer, t.byteOffset, t.byteLength);
    const bo = v.getUint16(0);
    if (bo !== 0x4949 && bo !== 0x4d4d) return null;
    const le = bo === 0x4949;
    return { v, le, ifd0: v.getUint32(4, le), len: t.length };
  }

  function findTag(info, ifd, tag) {
    const { v, le, len } = info;
    if (ifd + 2 > len) return -1;
    const n = v.getUint16(ifd, le);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > len) break;
      if (v.getUint16(e, le) === tag) return e;
    }
    return -1;
  }

  function gpsIfd(info) {
    const e = findTag(info, info.ifd0, 0x8825);
    if (e < 0) return -1;
    const off = info.v.getUint32(e + 8, info.le);
    return off + 2 <= info.len ? off : -1;
  }

  function exifHasGps(tiff) {
    const info = tiffInfo(tiff);
    if (!info) return false;
    const g = gpsIfd(info);
    return g >= 0 && info.v.getUint16(g, info.le) > 0;
  }

  /* Copia del EXIF lista para la imagen nueva: orientación a 1 (los píxeles ya
   * van girados) y, si se pide, sin ubicación GPS (se borran también los bytes). */
  function cleanExif(tiff, keepGps) {
    const t = tiff.slice();
    const info = tiffInfo(t);
    if (!info) return null;
    const { v, le } = info;
    const o = findTag(info, info.ifd0, 274);
    if (o >= 0) v.setUint16(o + 8, 1, le);
    if (!keepGps) {
      const g = gpsIfd(info);
      if (g >= 0) {
        const n = v.getUint16(g, le);
        for (let i = 0; i < n; i++) {
          const e = g + 2 + i * 12;
          if (e + 12 > t.length) break;
          const size = (TYPE_SIZE[v.getUint16(e + 2, le)] || 1) * v.getUint32(e + 4, le);
          if (size > 4) {
            const off = v.getUint32(e + 8, le);
            if (off + size <= t.length) t.fill(0, off, off + size);
          }
        }
        t.fill(0, g + 2, Math.min(t.length, g + 2 + n * 12 + 4));
        v.setUint16(g, 0, le);
      }
    }
    return t;
  }

  function riffChunk(type, data) {
    const out = new Uint8Array(8 + data.length + (data.length & 1));
    for (let i = 0; i < 4; i++) out[i] = type.charCodeAt(i);
    new DataView(out.buffer).setUint32(4, data.length, true);
    out.set(data, 8);
    return out;
  }

  function webpWithExif(u8, tiff) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const fourcc = (p) => String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]);
    if (fourcc(0) !== 'RIFF' || fourcc(8) !== 'WEBP') return null;
    const first = fourcc(12);
    const exif = riffChunk('EXIF', tiff);
    let body;
    if (first === 'VP8X') {
      const copy = u8.slice(12);
      copy[8] |= 0x08; // indicador EXIF
      body = [copy, exif];
    } else {
      let flags = 0x08, w, h;
      if (first === 'VP8L') {
        const bits = v.getUint32(21, true); // tras la firma 0x2f
        w = (bits & 0x3fff) + 1;
        h = ((bits >>> 14) & 0x3fff) + 1;
        if ((bits >>> 28) & 1) flags |= 0x10; // con alfa
      } else if (first === 'VP8 ') {
        w = v.getUint16(26, true) & 0x3fff;
        h = v.getUint16(28, true) & 0x3fff;
      } else {
        return null;
      }
      const vp8x = new Uint8Array(10);
      vp8x[0] = flags;
      vp8x[4] = (w - 1) & 0xff; vp8x[5] = ((w - 1) >> 8) & 0xff; vp8x[6] = ((w - 1) >> 16) & 0xff;
      vp8x[7] = (h - 1) & 0xff; vp8x[8] = ((h - 1) >> 8) & 0xff; vp8x[9] = ((h - 1) >> 16) & 0xff;
      body = [riffChunk('VP8X', vp8x), u8.subarray(12), exif];
    }
    const size = 4 + body.reduce((a, b) => a + b.length, 0);
    const head = new Uint8Array(12);
    head.set([0x52, 0x49, 0x46, 0x46], 0);
    new DataView(head.buffer).setUint32(4, size, true);
    head.set([0x57, 0x45, 0x42, 0x50], 8);
    return [head, ...body];
  }

  /* Añade el EXIF a un JPEG, PNG o WebP ya codificado. Otros formatos se devuelven igual. */
  async function injectExif(blob, fmtId, tiff) {
    if (!tiff || !['jpeg', 'png', 'webp'].includes(fmtId)) return blob;
    const u8 = new Uint8Array(await blob.arrayBuffer());
    const type = blob.type;
    if (fmtId === 'jpeg') {
      const len = 2 + 6 + tiff.length;
      if (len > 0xffff) return blob; // no cabe en un segmento APP1
      const seg = new Uint8Array(2 + len);
      seg.set([0xff, 0xe1, len >> 8, len & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
      seg.set(tiff, 10);
      let at = 2;
      if (u8[2] === 0xff && u8[3] === 0xe0) at = 4 + ((u8[4] << 8) | u8[5]); // tras JFIF
      return new Blob([u8.subarray(0, at), seg, u8.subarray(at)], { type });
    }
    if (fmtId === 'png') {
      let p = 8;
      while (p + 8 <= u8.length) {
        const len = ((u8[p] << 24) | (u8[p + 1] << 16) | (u8[p + 2] << 8) | u8[p + 3]) >>> 0;
        if (String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]) === 'IDAT') break;
        p += 12 + len;
      }
      return new Blob([u8.subarray(0, p), pngChunk('eXIf', tiff), u8.subarray(p)], { type });
    }
    const parts = webpWithExif(u8, tiff);
    return parts ? new Blob(parts, { type }) : blob;
  }

  return {
    makeCanvas, canvasToBlob,
    encodeBMP, encodeTIFF, encodeICO, encodeGIF, encodePNG8, wasmEncode, makePDF, makeZip,
    readJpegExif, exifHasGps, cleanExif, injectExif,
  };
}

if (typeof window !== 'undefined') window.Encoders = PixeloteEncoders(window);
