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

  global.Encoders = { encodeBMP, encodeTIFF, encodeICO, makeZip };
})(window);
