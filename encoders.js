/* Codificadores que el navegador no trae de serie (BMP, TIFF, ICO) y un
 * generador de ZIP sin compresión. Sin dependencias externas. */
(function (global) {
  'use strict';

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
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      const scale = s / side;
      const dw = Math.round(canvas.width * scale);
      const dh = Math.round(canvas.height * scale);
      g.drawImage(canvas, Math.round((s - dw) / 2), Math.round((s - dh) / 2), dw, dh);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
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

  /* Paleta por corte de mediana sobre una muestra de píxeles opacos. */
  function medianCut(data, maxColors) {
    const total = data.length / 4;
    const step = Math.max(1, Math.floor(total / 120000));
    const samples = [];
    for (let i = 0; i < total; i += step) {
      const o = i * 4;
      if (data[o + 3] >= 128) samples.push(data[o], data[o + 1], data[o + 2]);
    }
    const count = samples.length / 3;
    if (!count) return [[0, 0, 0]];
    const s = Uint8Array.from(samples);
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;

    function stats(box) {
      let lo = [255, 255, 255], hi = [0, 0, 0];
      for (let i = box.start; i < box.end; i++) {
        const o = idx[i] * 3;
        for (let c = 0; c < 3; c++) {
          const x = s[o + c];
          if (x < lo[c]) lo[c] = x;
          if (x > hi[c]) hi[c] = x;
        }
      }
      const ranges = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
      box.channel = ranges.indexOf(Math.max(...ranges));
      box.range = ranges[box.channel];
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
      const ch = b.channel;
      idx.subarray(b.start, b.end).sort((x, y) => s[x * 3 + ch] - s[y * 3 + ch]);
      const mid = (b.start + b.end) >> 1;
      boxes.splice(pick, 1, stats({ start: b.start, end: mid }), stats({ start: mid, end: b.end }));
    }

    return boxes.map((b) => {
      let r = 0, g = 0, bl = 0;
      for (let i = b.start; i < b.end; i++) {
        const o = idx[i] * 3;
        r += s[o]; g += s[o + 1]; bl += s[o + 2];
      }
      const n = b.end - b.start;
      return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
    });
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

  /* ---------- AVIF con WebAssembly (para navegadores que no lo generan) ---------- */

  const AVIF_URL = 'https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/codec/enc/avif_enc.js';

  // speed 8: ~8 veces más rápido que el valor por defecto (6) con poca pérdida de compresión
  const avifOptions = (quality) => ({
    quality: Math.round(quality * 100), qualityAlpha: -1, denoiseLevel: 0,
    tileColsLog2: 0, tileRowsLog2: 0, speed: 8, subsample: 1, chromaDeltaQ: false,
    sharpness: 0, tune: 0, enableSharpYUV: false, bitDepth: 8, lossless: false,
  });

  /* Se codifica en un Worker para no congelar la página; si el navegador no
   * permite crearlo, se hace en el hilo principal. Es un Worker clásico con
   * import() dinámico porque los Worker de módulo no arrancan desde file://. */
  const WORKER_SRC = `
    let mod;
    self.onmessage = async (e) => {
      try {
        mod = mod || await import('${AVIF_URL}').then((m) => m.default({ noInitialRun: true }));
        const { data, width, height, options } = e.data;
        const out = mod.encode(new Uint8Array(data), width, height, options);
        if (!out) throw new Error('Error al codificar AVIF');
        const copy = out.slice();
        self.postMessage({ ok: true, buf: copy.buffer }, [copy.buffer]);
      } catch (err) {
        self.postMessage({ ok: false, msg: String(err && err.message || err) });
      }
    };`;

  let avifWorker = null;
  let avifMain = null;
  let avifQueue = Promise.resolve();

  function avifInWorker(imageData, options) {
    if (!avifWorker) {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      avifWorker = new Worker(url);
    }
    return new Promise((res, rej) => {
      const w = avifWorker;
      w.onmessage = (e) => (e.data.ok ? res(e.data.buf) : rej(new Error(e.data.msg)));
      w.onerror = (e) => { e.preventDefault(); rej(new Error('worker')); };
      const copy = imageData.data.slice();
      w.postMessage({ data: copy.buffer, width: imageData.width, height: imageData.height, options }, [copy.buffer]);
    });
  }

  async function avifInMain(imageData, options) {
    if (!avifMain) {
      avifMain = import(AVIF_URL)
        .then((m) => m.default({ noInitialRun: true }))
        .catch((e) => { avifMain = null; throw e; });
    }
    const mod = await avifMain;
    const out = mod.encode(new Uint8Array(imageData.data.buffer), imageData.width, imageData.height, options);
    if (!out) throw new Error('Error al codificar AVIF');
    return out;
  }

  function encodeAVIF(imageData, quality) {
    const options = avifOptions(quality);
    const job = avifQueue.then(async () => {
      let out;
      if (avifWorker !== false) {
        try {
          out = await avifInWorker(imageData, options);
        } catch (e) {
          if (e.message !== 'worker') throw e;
          if (avifWorker) avifWorker.terminate();
          avifWorker = false; // el Worker no arranca aquí: se usa el hilo principal
        }
      }
      if (!out) out = await avifInMain(imageData, options);
      return new Blob([out], { type: 'image/avif' });
    });
    avifQueue = job.catch(() => {});
    return job;
  }

  global.Encoders = { encodeBMP, encodeTIFF, encodeICO, encodeGIF, encodeAVIF, makePDF, makeZip };
})(window);
