/* Procesado de una imagen: recorte, redimensionado, codificación y metadatos.
 *
 * Igual que PixeloteEncoders, se escribe como una función autocontenida para
 * poder enviarla como código a los Web Workers. Recibe un "trabajo" con todo lo
 * necesario (la imagen y los ajustes ya resueltos) y devuelve el archivo. */
function PixelotePipeline(Encoders) {
  'use strict';

  /* Reduce por mitades para que las reducciones grandes no se vean pixeladas. */
  function render(source, g, opaque, bg) {
    let cur = source, cx = g.sx, cy = g.sy, cw = g.sw, ch = g.sh;
    while (cw / 2 >= g.dw && ch / 2 >= g.dh) {
      const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
      const c = Encoders.makeCanvas(nw, nh);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      cur = c; cx = 0; cy = 0; cw = nw; ch = nh;
    }
    const out = Encoders.makeCanvas(g.dw, g.dh);
    const ctx = out.getContext('2d');
    if (opaque) { ctx.fillStyle = bg; ctx.fillRect(0, 0, g.dw, g.dh); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, g.dw, g.dh);
    return out;
  }

  function isLight(hex) {
    const n = parseInt(String(hex).replace('#', ''), 16) || 0;
    return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150;
  }

  /* Marca de agua opcional: texto o logo, en una de 9 posiciones o en mosaico.
   * Su tamaño es relativo al lado menor, así se ve igual en cualquier resolución. */
  function applyWatermark(canvas, wm) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const base = Math.min(W, H);
    const unit = Math.max(6, (base * wm.size) / 100);
    const font = (px) => `600 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    let mw, mh, paint;

    if (wm.type === 'logo') {
      if (!wm.logo) return;
      const lw = wm.logo.width, lh = wm.logo.height;
      mh = unit * 1.6;
      mw = (mh * lw) / lh;
      if (mw > W * 0.9) { mw = W * 0.9; mh = (mw * lh) / lw; }
      paint = (x, y) => ctx.drawImage(wm.logo, x, y, mw, mh);
    } else {
      const text = String(wm.text || '').trim();
      if (!text) return;
      let px = unit;
      ctx.font = font(px);
      mw = ctx.measureText(text).width;
      if (mw > W * 0.9) { px *= (W * 0.9) / mw; ctx.font = font(px); mw = ctx.measureText(text).width; }
      mh = px;
      const light = isLight(wm.color);
      paint = (x, y) => {
        ctx.font = font(px);
        ctx.textBaseline = 'top';
        ctx.fillStyle = wm.color;
        ctx.shadowColor = light ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.45)';
        ctx.shadowBlur = px * 0.15;
        ctx.fillText(text, x, y);
      };
    }

    ctx.save();
    ctx.globalAlpha = wm.opacity / 100;
    if (wm.pos === 'tile') {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-Math.PI / 6);
      const stepX = mw + unit * 3, stepY = mh + unit * 3;
      const R = Math.hypot(W, H) / 2 + Math.max(stepX, stepY);
      let row = 0;
      for (let y = -R; y < R; y += stepY, row++) {
        for (let x = -R + (row % 2) * (stepX / 2); x < R; x += stepX) paint(x, y);
      }
    } else {
      const m = Math.round(base * 0.03);
      const v = wm.pos[0], h = wm.pos[1];
      const x = h === 'l' ? m : h === 'c' ? (W - mw) / 2 : W - mw - m;
      const y = v === 't' ? m : v === 'm' ? (H - mh) / 2 : H - mh - m;
      paint(x, y);
    }
    ctx.restore();
  }

  /* Con MozJPEG activado se codifica de las dos formas y se queda el más
   * pequeño: MozJPEG suele ganar, pero en imágenes con mucho detalle fino a
   * veces pesa más. Si no se puede descargar, solo el JPEG del navegador. */
  async function encodeJPEG(canvas, job, q, px) {
    const native = await Encoders.canvasToBlob(canvas, 'image/jpeg', q);
    if (job.mozjpeg && !job.mozFailed) {
      try {
        const moz = await Encoders.wasmEncode('mozjpeg', px(), q);
        return moz.size < native.size ? moz : native;
      } catch (e) {
        job.mozFailed = true;
      }
    }
    return native;
  }

  async function encode(canvas, job, q, px) {
    switch (job.fmt.id) {
      case 'bmp': return Encoders.encodeBMP(px());
      case 'tiff': return Encoders.encodeTIFF(px());
      case 'gif': return Encoders.encodeGIF(px());
      case 'ico': return Encoders.encodeICO(canvas);
      case 'jpeg': return encodeJPEG(canvas, job, q, px);
      case 'png':
        return job.pngMode === 'palette'
          ? Encoders.encodePNG8(px(), job.pngColors)
          : Encoders.canvasToBlob(canvas, 'image/png');
      case 'avif':
        return job.nativeAvif
          ? Encoders.canvasToBlob(canvas, 'image/avif', q)
          : Encoders.wasmEncode('avif', px(), q);
      case 'pdf': {
        const page = { jpeg: await encodeJPEG(canvas, job, q, px), w: canvas.width, h: canvas.height };
        return { blob: await Encoders.makePDF([page], job.pdfPage), page };
      }
      default:
        return Encoders.canvasToBlob(canvas, job.fmt.mime, q);
    }
  }

  async function run(job) {
    const canvas = render(job.source, job.g, !job.fmt.alpha, job.bg);
    if (job.source.close) job.source.close(); // ImageBitmap: libera memoria cuanto antes
    if (job.wm) {
      applyWatermark(canvas, job.wm);
      if (job.wm.logo && job.wm.logo.close) job.wm.logo.close();
    }
    let pixels = null;
    const px = () => pixels || (pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height));
    const once = async (q) => {
      const r = await encode(canvas, job, q, px);
      return r instanceof Blob ? { blob: r } : r;
    };

    // Si hay tamaño objetivo, busca la mayor calidad que lo cumpla
    let q = job.quality / 100;
    let res = await once(q);
    let missed = false;
    const target = job.targetKB * 1024;
    if (job.fmt.lossy && job.targetOn && target > 0 && res.blob.size > target) {
      let lo = 0.03, hi = q, best = null;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        const r = await once(mid);
        if (r.blob.size <= target) { best = { r, q: mid }; lo = mid; } else { hi = mid; }
      }
      if (best) { res = best.r; q = best.q; } else { res = await once(0.03); q = 0.03; missed = true; }
    }

    let blob = res.blob;
    if (job.exif) blob = await Encoders.injectExif(blob, job.fmt.id, job.exif);
    return { blob, page: res.page, q, missed, mozFailed: !!job.mozFailed };
  }

  return { run, render, applyWatermark };
}

if (typeof window !== 'undefined') window.Pipeline = PixelotePipeline(window.Encoders);
