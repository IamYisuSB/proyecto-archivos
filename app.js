(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Catálogo ---------- */

  const FORMATS = [
    { id: 'auto', label: 'Auto', ext: '', desc: 'Elige el formato según cada imagen: fotos, imágenes con transparencia o gráficos y capturas.' },
    { id: 'original', label: 'Original', ext: '', desc: 'Mantiene el formato de cada imagen y solo la comprime o ajusta.' },
    { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', lossy: true, alpha: true, desc: 'Muy ligero y con transparencia. Ideal para webs.' },
    { id: 'jpeg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg', lossy: true, alpha: false, desc: 'El más compatible. Perfecto para fotos.' },
    { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png', lossy: false, alpha: true, desc: 'Sin pérdida y con transparencia. Logos, capturas, gráficos.' },
    { id: 'avif', label: 'AVIF', mime: 'image/avif', ext: 'avif', lossy: true, alpha: true, desc: 'La máxima compresión moderna.' },
    { id: 'gif', label: 'GIF', ext: 'gif', custom: true, lossy: false, alpha: true, desc: 'Compatible con todo, pero limitado a 256 colores. Bien para gráficos sencillos, no para fotos.' },
    { id: 'pdf', label: 'PDF', ext: 'pdf', custom: true, lossy: true, alpha: false, desc: 'Documento PDF con una imagen por página, o todas juntas en un solo PDF.' },
    { id: 'bmp', label: 'BMP', ext: 'bmp', custom: true, lossy: false, alpha: false, desc: 'Mapa de bits sin comprimir. Para programas antiguos.' },
    { id: 'tiff', label: 'TIFF', ext: 'tiff', custom: true, lossy: false, alpha: true, desc: 'Sin pérdida. Para impresión y archivo.' },
    { id: 'ico', label: 'ICO', ext: 'ico', custom: true, lossy: false, alpha: true, desc: 'Icono de Windows / favicon con varios tamaños (16–256 px).' },
  ];
  const FMT = Object.fromEntries(FORMATS.map((f) => [f.id, f]));
  const MIME_TO_FMT = {
    'image/webp': 'webp', 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/avif': 'avif',
    'image/bmp': 'bmp', 'image/x-ms-bmp': 'bmp', 'image/tiff': 'tiff',
    'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/gif': 'gif',
  };
  // Formato de salida con "Original" para lo que solo se puede leer
  const KIND_TO_FMT = { heic: 'jpeg', raw: 'jpeg', tiff: 'tiff' };
  const CLASS_LABEL = { photo: 'foto', alpha: 'transparencia', graphic: 'gráfico' };
  // Resultados que el navegador puede mostrar en el comparador
  const VIEWABLE = ['webp', 'jpeg', 'png', 'avif', 'gif', 'pdf'];
  const META_FORMATS = ['jpeg', 'png', 'webp'];

  const RATIOS = [
    { id: 'none', label: 'Sin recorte' },
    { id: '1:1', label: '1:1' },
    { id: '4:5', label: '4:5' },
    { id: '4:3', label: '4:3' },
    { id: '3:2', label: '3:2' },
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
  ];

  const PRESETS = [
    { label: 'Web optimizada', emoji: '🌐', set: { format: 'webp', quality: 80, resizeMode: 'max', maxW: 1920, maxH: 1920, cropRatio: 'none', targetOn: false } },
    { label: 'Instagram', emoji: '📸', set: { format: 'jpeg', quality: 85, resizeMode: 'max', maxW: 1080, maxH: 1080, cropRatio: '1:1', targetOn: false } },
    { label: 'Para email', emoji: '✉️', set: { format: 'jpeg', quality: 75, resizeMode: 'max', maxW: 1600, maxH: 1600, cropRatio: 'none', targetOn: true, targetKB: 300 } },
    { label: 'Miniaturas', emoji: '🖼️', set: { format: 'webp', quality: 72, resizeMode: 'max', maxW: 400, maxH: 400, cropRatio: 'none', targetOn: false } },
    { label: 'Sin pérdida', emoji: '💎', set: { format: 'png', pngMode: 'lossless', resizeMode: 'none', cropRatio: 'none', targetOn: false } },
    { label: 'Favicon', emoji: '⭐', set: { format: 'ico', resizeMode: 'none', cropRatio: '1:1', targetOn: false } },
  ];

  const DEFAULTS = {
    format: 'webp', quality: 82, targetOn: false, targetKB: 200,
    resizeMode: 'none', percent: 50, maxW: 1920, maxH: 1920, exactW: 1080, exactH: 1080, cover: true,
    cropRatio: 'none', bg: '#ffffff', pattern: '{nombre}',
    pdfMerge: true, pdfPage: 'fit',
    pngMode: 'lossless', pngColors: 256, mozjpeg: true, meta: 'strip',
    autoPhoto: 'webp', autoAlpha: 'webp', autoGraphic: 'png',
  };
  const STORE_KEY = 'pixelote.settings.v1';

  /* ---------- Estado ---------- */

  let settings = loadSettings();
  let version = 0; // sube cada vez que cambian los ajustes
  const items = [];
  const supported = {};
  let nativeAvif = false;
  const pdfPages = new WeakMap(); // PDF de una página → su JPEG, para unirlos después
  let busy = false;
  let nextId = 1;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (_) { /* almacenamiento no disponible */ }
    return Object.assign({}, DEFAULTS);
  }
  function saveSettings() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (_) { /* nada */ }
  }

  /* ---------- Utilidades ---------- */

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function ratioValue(id, w, h) {
    if (id === 'original') return w / h;
    const [a, b] = id.split(':').map(Number);
    return a / b;
  }
  function baseName(name) {
    return name.replace(/\.[^.]+$/, '') || 'imagen';
  }
  function nextFrame() {
    return new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  }
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function canvasToBlob(canvas, mime, quality) {
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo codificar'))), mime, quality));
  }
  function markStale(it) {
    if (it.result) it.result.version = -1;
  }
  function usable(it) {
    return it.status !== 'invalid' && it.status !== 'loading';
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Detección de formatos ---------- */

  async function detectSupport() {
    const c = makeCanvas(2, 2);
    for (const f of FORMATS) {
      if (!f.mime) { supported[f.id] = true; continue; }
      try {
        const b = await new Promise((r) => c.toBlob(r, f.mime, 0.8));
        supported[f.id] = !!b && b.type === f.mime;
      } catch (_) { supported[f.id] = false; }
    }
    // Si el navegador no genera AVIF, se usa el codificador WebAssembly
    nativeAvif = supported.avif;
    supported.avif = true;
    if (!nativeAvif) FMT.avif.desc += ' Este navegador no lo genera, así que se descargará un codificador la primera vez (y es más lento).';
  }

  /* Formato real de salida para una imagen (resuelve "Auto" y "Original"). */
  function outFormat(it, s = settings) {
    if (s.format === 'auto') {
      const pick = { photo: s.autoPhoto, alpha: s.autoAlpha, graphic: s.autoGraphic }[it.cls || 'photo'];
      return FMT[pick] || FMT.webp;
    }
    if (s.format !== 'original') return FMT[s.format];
    const id = MIME_TO_FMT[it.file.type] || KIND_TO_FMT[it.kind];
    if (id && supported[id]) return FMT[id];
    return FMT.png; // SVG y otros → PNG para no perder transparencia
  }

  /* ---------- Orientación: girar y voltear ---------- */

  // Matrices 2×2 [a, b, c, d] como en setTransform (eje y hacia abajo)
  const IDENTITY = [1, 0, 0, 1];
  const OPS = {
    cw: [0, 1, -1, 0],   // 90° en el sentido del reloj
    ccw: [0, -1, 1, 0],
    fh: [-1, 0, 0, 1],   // voltear horizontal
    fv: [1, 0, 0, -1],   // voltear vertical
  };
  function mul(t, m) {
    return [t[0] * m[0] + t[2] * m[1], t[1] * m[0] + t[3] * m[1], t[0] * m[2] + t[2] * m[3], t[1] * m[2] + t[3] * m[3]];
  }
  function isIdentity(m) {
    return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
  }
  /* Tamaño final y desplazamiento para dibujar W×H con la matriz m. */
  function placement(m, W, H) {
    const xs = [0, m[0] * W, m[2] * H, m[0] * W + m[2] * H];
    const ys = [0, m[1] * W, m[3] * H, m[1] * W + m[3] * H];
    const minX = Math.min(...xs), minY = Math.min(...ys);
    return { w: Math.max(...xs) - minX, h: Math.max(...ys) - minY, e: -minX, f: -minY };
  }
  function drawOriented(src, m, W, H, scale = 1) {
    const sw = Math.max(1, Math.round(W * scale)), sh = Math.max(1, Math.round(H * scale));
    const p = placement(m, sw, sh);
    const c = makeCanvas(Math.round(p.w), Math.round(p.h));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(m[0], m[1], m[2], m[3], p.e, p.f);
    ctx.drawImage(src, 0, 0, sw, sh);
    return c;
  }
  /* Lleva un recorte normalizado (0–1) al espacio girado por t. */
  function transformRect(r, t) {
    const p = placement(t, 1, 1);
    const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]
      .map(([x, y]) => [t[0] * x + t[2] * y + p.e, t[1] * x + t[3] * y + p.f]);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  function orientedSize(it, m = it.m) {
    const p = placement(m, it.baseW, it.baseH);
    return { w: Math.round(p.w), h: Math.round(p.h) };
  }
  /* Imagen ya girada a resolución completa (se guarda hasta el próximo giro). */
  function orientedSource(it) {
    if (isIdentity(it.m)) return it.img;
    const key = it.m.join();
    if (it.oriented && it.orientedKey === key) return it.oriented;
    it.oriented = drawOriented(it.img, it.m, it.baseW, it.baseH);
    it.orientedKey = key;
    return it.oriented;
  }

  async function refreshThumb(it) {
    const token = (it.thumbToken = (it.thumbToken || 0) + 1);
    let url = null;
    if (!isIdentity(it.m)) {
      const k = Math.min(1, 480 / Math.max(it.baseW, it.baseH));
      url = URL.createObjectURL(await canvasToBlob(drawOriented(it.img, it.m, it.baseW, it.baseH, k), 'image/png'));
    }
    if (token !== it.thumbToken) { if (url) URL.revokeObjectURL(url); return; }
    if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
    it.thumbUrl = url;
    updateCard(it);
  }

  function setOrientation(it, m, crop) {
    it.m = m;
    it.crop = crop;
    const { w, h } = orientedSize(it);
    it.w = w; it.h = h;
    it.oriented = null;
    markStale(it);
    updateCard(it);
    refreshThumb(it);
  }

  function rotateItem(it, op) {
    if (!usable(it)) return;
    setOrientation(it, mul(OPS[op], it.m), it.crop ? transformRect(it.crop, OPS[op]) : null);
  }

  /* ---------- Geometría ---------- */

  function centerCrop(rect, r) {
    let { x, y, w, h } = rect;
    if (w / h > r) { const nw = h * r; x += (w - nw) / 2; w = nw; }
    else { const nh = w / r; y += (h - nh) / 2; h = nh; }
    return { x, y, w, h };
  }

  function geometry(it, s = settings) {
    let src = { x: 0, y: 0, w: it.w, h: it.h };
    if (it.crop) {
      src = { x: it.crop.x * it.w, y: it.crop.y * it.h, w: it.crop.w * it.w, h: it.crop.h * it.h };
    } else if (s.cropRatio !== 'none') {
      src = centerCrop(src, ratioValue(s.cropRatio, it.w, it.h));
    }

    let dw = src.w, dh = src.h;
    if (s.resizeMode === 'percent') {
      dw = src.w * s.percent / 100; dh = src.h * s.percent / 100;
    } else if (s.resizeMode === 'max') {
      const mw = s.maxW > 0 ? s.maxW : Infinity;
      const mh = s.maxH > 0 ? s.maxH : Infinity;
      const k = Math.min(1, mw / src.w, mh / src.h);
      dw = src.w * k; dh = src.h * k;
    } else if (s.resizeMode === 'exact') {
      dw = s.exactW > 0 ? s.exactW : src.w;
      dh = s.exactH > 0 ? s.exactH : src.h;
      if (s.cover) src = centerCrop(src, dw / dh);
    }
    return {
      sx: Math.round(src.x), sy: Math.round(src.y),
      sw: Math.max(1, Math.round(src.w)), sh: Math.max(1, Math.round(src.h)),
      dw: Math.max(1, Math.round(dw)), dh: Math.max(1, Math.round(dh)),
    };
  }

  function outputName(it, index, g, fmt, s) {
    const total = items.length;
    const n = String(index + 1).padStart(String(total).length, '0');
    const pattern = s.pattern.trim() || '{nombre}';
    let name = pattern
      .replace(/\{nombre\}/gi, baseName(it.file.name))
      .replace(/\{n\}/gi, n)
      .replace(/\{ancho\}/gi, g.dw)
      .replace(/\{alto\}/gi, g.dh);
    name = name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'imagen';
    return name + '.' + fmt.ext;
  }

  /* ---------- Procesado en segundo plano ---------- */

  /* Trabajo autocontenido para el pipeline (se puede enviar a un Worker). */
  function buildJob(it, s, source) {
    const fmt = outFormat(it, s);
    const job = {
      source, g: geometry(it, s),
      fmt: { id: fmt.id, mime: fmt.mime, lossy: !!fmt.lossy, alpha: !!fmt.alpha },
      quality: s.quality, targetOn: s.targetOn, targetKB: s.targetKB, bg: s.bg,
      pdfPage: s.pdfPage, pngMode: s.pngMode, pngColors: s.pngColors,
      mozjpeg: s.mozjpeg, nativeAvif, exif: null,
    };
    if (it.exif && s.meta !== 'strip' && META_FORMATS.includes(fmt.id)) {
      job.exif = Encoders.cleanExif(it.exif, s.meta === 'keep');
    }
    return job;
  }

  /* Varios Workers procesan imágenes a la vez. Si el navegador no los permite
   * (o no tiene OffscreenCanvas), todo se hace en la página, una a una. */
  const pool = { slots: [], ready: null };
  let jobSeq = 0;

  function initPool() {
    if (pool.ready) return pool.ready;
    pool.ready = (async () => {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || !window.createImageBitmap) return 0;
      const src = `${PixeloteEncoders}\n${PixelotePipeline}\n` +
        'const Encoders = PixeloteEncoders(self);\nconst Pipeline = PixelotePipeline(Encoders);\n' +
        'self.onmessage = async (e) => {\n' +
        "  if (e.data === 'ping') { self.postMessage('pong'); return; }\n" +
        '  const { id, job } = e.data;\n' +
        '  try { self.postMessage({ id, ok: true, r: await Pipeline.run(job) }); }\n' +
        '  catch (err) { self.postMessage({ id, ok: false, msg: String((err && err.message) || err) }); }\n' +
        '};';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
      const workers = [];
      for (let i = 0; i < n; i++) {
        try { workers.push(new Worker(url)); } catch (_) { break; }
      }
      const alive = await Promise.all(workers.map((w) => new Promise((res) => {
        const t = setTimeout(() => res(false), 5000);
        w.onmessage = (e) => { if (e.data === 'pong') { clearTimeout(t); res(true); } };
        w.onerror = (e) => { e.preventDefault(); clearTimeout(t); res(false); };
        w.postMessage('ping');
      })));
      workers.forEach((w, i) => { if (!alive[i]) w.terminate(); });
      pool.slots = workers.filter((_, i) => alive[i]);
      return pool.slots.length;
    })();
    return pool.ready;
  }

  function runInWorker(worker, job) {
    return new Promise((res, rej) => {
      const id = ++jobSeq;
      worker.onmessage = (e) => {
        if (e.data.id !== id) return;
        if (e.data.ok) res(e.data.r); else rej(new Error(e.data.msg));
      };
      worker.onerror = (e) => { e.preventDefault(); rej(new Error('worker')); };
      worker.postMessage({ id, job }, [job.source]);
    });
  }

  async function processItem(it, s, worker, runVersion) {
    let r = null;
    if (worker) {
      try {
        const bitmap = await createImageBitmap(orientedSource(it));
        r = await runInWorker(worker, buildJob(it, s, bitmap));
      } catch (e) {
        console.warn('No se pudo procesar en segundo plano; se reintenta en la página:', e.message);
      }
    }
    if (!r) r = await Pipeline.run(buildJob(it, s, orientedSource(it)));
    if (r.page) pdfPages.set(r.blob, r.page);
    const fmt = outFormat(it, s);
    const g = geometry(it, s);
    return {
      blob: r.blob, url: URL.createObjectURL(r.blob), name: outputName(it, items.indexOf(it), g, fmt, s),
      fmt: fmt.label, fmtId: fmt.id, q: r.q, missed: r.missed, mozFailed: r.mozFailed, version: runVersion,
    };
  }

  async function processAll() {
    const todo = items.filter(usable);
    if (busy || !todo.length) return;
    busy = true;
    const s = Object.assign({}, settings);
    const runVersion = version;
    const btn = $('#processBtn');
    const bar = $('#progressBar');
    $('#progress').hidden = false;
    bar.style.width = '0%';
    refreshChrome();
    btn.textContent = 'Preparando…';

    const nWorkers = await initPool();
    const lanes = nWorkers ? pool.slots : [null];
    const queue = todo.slice();
    let done = 0, failed = 0, mozFailed = false;

    async function lane(worker) {
      while (queue.length) {
        const it = queue.shift();
        it.status = 'working';
        updateCard(it);
        await nextFrame();
        try {
          const res = await processItem(it, s, worker, runVersion);
          if (it.result) URL.revokeObjectURL(it.result.url);
          it.result = res;
          it.status = 'ready';
          if (res.mozFailed) mozFailed = true;
        } catch (e) {
          console.error(e);
          it.status = 'error';
          failed++;
        }
        updateCard(it);
        done++;
        bar.style.width = (done / todo.length * 100) + '%';
        btn.textContent = `Procesando ${Math.min(done + 1, todo.length)} de ${todo.length}…`;
      }
    }
    btn.textContent = `Procesando 1 de ${todo.length}…`;
    await Promise.all(lanes.map(lane));

    busy = false;
    setTimeout(() => { $('#progress').hidden = true; }, 600);
    refreshChrome();
    let msg = failed ? `Listo, pero ${failed} no se pudieron convertir` : `¡Listo! ${done} ${done === 1 ? 'imagen convertida' : 'imágenes convertidas'}`;
    if (mozFailed) msg += ' (sin MozJPEG: hace falta internet la primera vez)';
    toast(msg);
  }

  /* ---------- Carga de archivos ---------- */

  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('unsupported')); };
      img.src = url;
    });
  }

  /* Primero el navegador; si no puede, el decodificador del formato. */
  async function openFile(it) {
    try { return await loadImage(it.file); } catch (_) { /* sigue */ }
    if (!it.kind) throw new Error('Tu navegador no puede leer este archivo');
    const label = Codecs.LABELS[it.kind];
    it.loadingMsg = `Decodificando ${label}…`;
    updateCard(it);
    let blob;
    try {
      blob = await Codecs.decode(it.file, it.kind);
    } catch (e) {
      console.error(e);
      if (/descargar/.test(e.message) || !navigator.onLine) throw new Error(`Para leer ${label} hace falta internet la primera vez`);
      const detail = /^(Compresión|Este RAW)/.test(e.message) ? `: ${e.message.charAt(0).toLowerCase()}${e.message.slice(1)}` : '';
      throw new Error(`No se pudo leer este ${label}${detail}`);
    }
    return loadImage(blob);
  }

  /* Foto, imagen con transparencia o gráfico (pocos colores planos), para "Auto". */
  function classify(it) {
    if (it.kind === 'heic' || it.kind === 'raw') return 'photo';
    if (it.file.type === 'image/gif') return 'graphic';
    const k = Math.min(1, 160 / Math.max(it.w, it.h));
    const c = makeCanvas(Math.max(1, Math.round(it.w * k)), Math.max(1, Math.round(it.h * k)));
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(it.img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let alpha = false;
    const counts = new Map();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) alpha = true;
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (alpha && it.file.type !== 'image/jpeg') return 'alpha';
    const top = Array.from(counts.values()).sort((a, b) => b - a).slice(0, 16).reduce((a, b) => a + b, 0);
    return top / (d.length / 4) >= 0.5 ? 'graphic' : 'photo';
  }

  async function readExif(it) {
    if (it.file.type !== 'image/jpeg') return;
    try {
      const exif = Encoders.readJpegExif(await it.file.slice(0, 256 * 1024).arrayBuffer());
      if (exif) { it.exif = exif; it.gps = Encoders.exifHasGps(exif); }
    } catch (_) { /* sin EXIF legible */ }
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || Codecs.kindOf(f) || /\.(bmp|ico|svg|avif|webp)$/i.test(f.name));
    if (!files.length) { toast('No he encontrado imágenes en lo que has soltado'); return; }

    for (const file of files) {
      const it = { id: nextId++, file, kind: Codecs.kindOf(file), status: 'loading', crop: null, result: null, m: IDENTITY };
      items.push(it);
      it.el = createCard(it);
      $('#grid').appendChild(it.el);
    }
    refreshChrome();

    for (const it of items.filter((i) => i.status === 'loading')) {
      try {
        const { img, url } = await openFile(it);
        it.img = img; it.url = url;
        it.baseW = it.w = img.naturalWidth || 1024;
        it.baseH = it.h = img.naturalHeight || 1024;
        it.cls = classify(it);
        await readExif(it);
        it.status = 'ready';
      } catch (e) {
        it.status = 'invalid';
        it.errorMsg = e.message;
      }
      updateCard(it);
    }
    refreshChrome();
  }

  function removeItem(it) {
    const i = items.indexOf(it);
    if (i < 0) return;
    items.splice(i, 1);
    if (it.url) URL.revokeObjectURL(it.url);
    if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
    if (it.result) URL.revokeObjectURL(it.result.url);
    it.el.remove();
    refreshChrome();
  }

  function clearAll() {
    while (items.length) removeItem(items[0]);
  }

  /* ---------- Tarjetas ---------- */

  function createCard(it) {
    const li = document.createElement('li');
    li.className = 'item';
    li.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'remove') removeItem(it);
      else if (act === 'crop') openCrop(it);
      else if (act === 'rotate') rotateItem(it, 'cw');
      else if (act === 'compare') openCompare(it);
    });
    return li;
  }

  function updateCard(it) {
    const li = it.el;
    const name = esc(it.file.name);
    const origSize = fmtBytes(it.file.size);

    if (it.status === 'loading') {
      li.className = 'item loading';
      li.innerHTML = `<div class="thumb skeleton"></div><div class="meta"><div class="name" title="${name}">${name}</div><div class="sub">${esc(it.loadingMsg || 'Cargando…')}</div></div>`;
      return;
    }
    if (it.status === 'invalid') {
      li.className = 'item invalid';
      li.innerHTML = `
        <div class="thumb broken" aria-hidden="true">⚠</div>
        <div class="meta">
          <div class="name" title="${name}">${name}</div>
          <div class="sub err">${esc(it.errorMsg || 'Tu navegador no puede leer este archivo')}</div>
        </div>
        <button class="icon-btn rm" data-act="remove" title="Quitar" aria-label="Quitar">✕</button>`;
      return;
    }

    const g = geometry(it);
    const fmt = outFormat(it);
    const r = it.result;
    const stale = r && r.version !== version;
    let resultHtml = '';
    if (it.status === 'working') {
      resultHtml = `<div class="result working"><span class="spinner"></span> Procesando…</div>`;
    } else if (it.status === 'error') {
      resultHtml = `<div class="result err">No se pudo convertir</div>`;
    } else if (r) {
      const diff = Math.round((1 - r.blob.size / it.file.size) * 100);
      const badge = diff > 0
        ? `<span class="badge good">−${diff}%</span>`
        : `<span class="badge bad">+${Math.abs(diff)}%</span>`;
      const canCompare = !stale && VIEWABLE.includes(r.fmtId);
      resultHtml = `
        <div class="result ${stale ? 'stale' : ''}">
          <div class="res-line"><b>${esc(r.fmt)}</b> · ${fmtBytes(r.blob.size)} ${badge}</div>
          ${r.missed ? '<div class="sub warn">No se alcanzó el tamaño objetivo</div>' : ''}
          ${stale ? '<div class="sub warn">Ajustes cambiados: vuelve a convertir</div>' : ''}
          <div class="res-actions">
            ${canCompare ? '<button type="button" class="btn small ghost" data-act="compare" title="Comparar antes y después">⇆ Comparar</button>' : ''}
            <a class="btn small primary dl" href="${r.url}" download="${esc(r.name)}">Descargar</a>
          </div>
        </div>`;
    }

    const gpsTitle = settings.meta === 'keep' ? 'Contiene ubicación GPS y se conservará' : 'Contiene ubicación GPS (se eliminará)';
    const tags = [
      it.crop ? '<span class="tag">✂ recorte</span>' : '',
      !isIdentity(it.m) ? '<span class="tag">⟳ girada</span>' : '',
      it.gps ? `<span class="tag" title="${gpsTitle}">📍 GPS</span>` : '',
    ].join('');
    const auto = settings.format === 'auto' && it.cls ? ` · ${CLASS_LABEL[it.cls]}` : '';

    li.className = 'item' + (r && !stale ? ' done' : '');
    li.innerHTML = `
      <div class="thumb">
        <img src="${it.thumbUrl || it.url}" alt="" loading="lazy">
        <div class="tags">${tags}</div>
        <div class="thumb-actions">
          <button class="icon-btn" data-act="rotate" title="Girar 90°" aria-label="Girar 90 grados">⟳</button>
          <button class="icon-btn" data-act="crop" title="Recortar y girar" aria-label="Recortar y girar">✂</button>
          <button class="icon-btn" data-act="remove" title="Quitar" aria-label="Quitar">✕</button>
        </div>
      </div>
      <div class="meta">
        <div class="name" title="${name}">${name}</div>
        <div class="sub">${it.kind ? `<span class="src-tag">${Codecs.LABELS[it.kind]}</span> ` : ''}${it.w}×${it.h} · ${origSize}</div>
        <div class="sub arrow">→ ${g.dw}×${g.dh} · ${esc(fmt.label)}${auto}</div>
      </div>
      ${resultHtml}`;
  }

  /* ---------- Toolbar, resumen y botones ---------- */

  function refreshChrome() {
    const valid = items.filter(usable);
    const has = items.length > 0;
    $('#dropzone').classList.toggle('compact', has);
    $('#toolbar').hidden = !has;
    const total = items.reduce((a, i) => a + i.file.size, 0);
    $('#toolbarInfo').innerHTML = `<b>${items.length}</b> ${items.length === 1 ? 'imagen' : 'imágenes'} · ${fmtBytes(total)}`;
    $('#rotateAllBtn').disabled = busy || !valid.length;

    const btn = $('#processBtn');
    btn.disabled = busy || valid.length === 0;
    if (!busy) {
      const anyDone = items.some((i) => i.result);
      btn.textContent = valid.length
        ? `${anyDone ? 'Volver a convertir' : 'Convertir'} ${valid.length} ${valid.length === 1 ? 'imagen' : 'imágenes'}`
        : 'Convertir imágenes';
    }

    const done = items.filter((i) => i.result && i.result.version === version);
    $('#zipBtn').disabled = busy || done.length === 0;
    $('#zipLabel').textContent = done.length <= 1 ? 'Descargar'
      : mergePdf(done) ? `Descargar PDF único (${done.length} páginas)` : 'Descargar todo (.zip)';

    const sum = $('#summary');
    if (done.length && !busy) {
      const before = done.reduce((a, i) => a + i.file.size, 0);
      const after = done.reduce((a, i) => a + i.result.blob.size, 0);
      const pct = Math.round((1 - after / before) * 100);
      sum.hidden = false;
      sum.innerHTML = `
        <div class="sum-item"><span>Antes</span><b>${fmtBytes(before)}</b></div>
        <div class="sum-arrow" aria-hidden="true">→</div>
        <div class="sum-item"><span>Después</span><b>${fmtBytes(after)}</b></div>
        <div class="sum-item big ${pct >= 0 ? 'good' : 'bad'}"><span>${pct >= 0 ? 'Ahorro' : 'Aumento'}</span><b>${Math.abs(pct)}%</b></div>`;
    } else {
      sum.hidden = true;
    }
  }

  function uniqueNames(list) {
    const seen = new Map();
    return list.map(({ name, blob }) => {
      let n = name;
      if (seen.has(name)) {
        const k = seen.get(name) + 1;
        seen.set(name, k);
        n = name.replace(/(\.[^.]+)$/, `-${k}$1`);
      } else {
        seen.set(name, 1);
      }
      return { name: n, blob };
    });
  }

  function download(blob, name) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function mergePdf(done) {
    return settings.format === 'pdf' && settings.pdfMerge && done.every((i) => pdfPages.has(i.result.blob));
  }

  async function downloadAll() {
    const done = items.filter((i) => i.result && i.result.version === version);
    if (!done.length) return;
    if (done.length === 1) { download(done[0].result.blob, done[0].result.name); return; }
    const btn = $('#zipBtn');
    btn.disabled = true;
    const merge = mergePdf(done);
    $('#zipLabel').textContent = merge ? 'Creando PDF…' : 'Creando ZIP…';
    try {
      if (merge) {
        download(await Encoders.makePDF(done.map((i) => pdfPages.get(i.result.blob)), settings.pdfPage), 'imagenes-pixelote.pdf');
        return;
      }
      const zip = await Encoders.makeZip(uniqueNames(done.map((i) => ({ name: i.result.name, blob: i.result.blob }))));
      download(zip, 'imagenes-pixelote.zip');
    } finally {
      refreshChrome();
    }
  }

  /* ---------- Panel de ajustes ---------- */

  function bindSegmented(id, key) {
    $('#' + id).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      settings[key] = b.dataset.v;
      changed();
    });
  }

  function buildPanel() {
    $('#presets').innerHTML = PRESETS.map((p, i) =>
      `<button type="button" class="preset" data-i="${i}"><span aria-hidden="true">${p.emoji}</span>${esc(p.label)}</button>`).join('');
    $('#presets').addEventListener('click', (e) => {
      const b = e.target.closest('.preset');
      if (!b) return;
      const p = PRESETS[+b.dataset.i];
      if (p.set.format && !supported[p.set.format]) { toast(`Tu navegador no puede generar ${FMT[p.set.format].label}`); return; }
      Object.assign(settings, p.set);
      changed();
      toast(`Atajo aplicado: ${p.label}`);
    });

    $('#formats').innerHTML = FORMATS.map((f) => `
      <button type="button" role="radio" class="fmt" data-v="${f.id}" ${supported[f.id] ? '' : 'disabled title="Tu navegador no puede generar este formato"'}>
        <b>${f.label}</b>
        <small>${f.id === 'auto' ? 'según imagen' : f.id === 'original' ? 'mismo formato' : f.lossy ? 'con pérdida' : 'sin pérdida'}</small>
      </button>`).join('');
    $('#formats').addEventListener('click', (e) => {
      const b = e.target.closest('.fmt');
      if (!b || b.disabled) return;
      settings.format = b.dataset.v;
      changed();
    });

    $('#ratios').innerHTML = RATIOS.map((r) => `<button type="button" role="radio" class="chip" data-v="${r.id}">${r.label}</button>`).join('');
    $('#ratios').addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      settings.cropRatio = b.dataset.v;
      changed();
    });

    bindSegmented('pdfPage', 'pdfPage');
    bindSegmented('resizeMode', 'resizeMode');
    bindSegmented('pngMode', 'pngMode');
    bindSegmented('meta', 'meta');

    for (const key of ['autoPhoto', 'autoAlpha', 'autoGraphic']) {
      $('#' + key).addEventListener('change', (e) => { settings[key] = e.target.value; changed(); });
    }
    const numeric = ['quality', 'percent', 'maxW', 'maxH', 'exactW', 'exactH', 'targetKB', 'pngColors'];
    for (const key of numeric) {
      $('#' + key).addEventListener('input', (e) => {
        settings[key] = e.target.value === '' ? 0 : Number(e.target.value);
        changed(true);
      });
    }
    for (const key of ['targetOn', 'cover', 'pdfMerge', 'mozjpeg']) {
      $('#' + key).addEventListener('change', (e) => { settings[key] = e.target.checked; changed(); });
    }
    $('#bg').addEventListener('input', (e) => { settings.bg = e.target.value; changed(true); });
    $('#pattern').addEventListener('input', (e) => { settings.pattern = e.target.value; changed(true); });
    $('#resetBtn').addEventListener('click', () => {
      settings = Object.assign({}, DEFAULTS);
      if (!supported[settings.format]) settings.format = 'jpeg';
      changed();
      toast('Ajustes restablecidos');
    });
  }

  function markSegmented(id, value) {
    $$(`#${id} button`).forEach((b) => b.setAttribute('aria-checked', b.dataset.v === value));
  }

  /* Refleja los ajustes en el panel. `fromInput` evita reescribir el campo que se está tecleando. */
  function syncPanel(fromInput) {
    const s = settings;
    $$('#formats .fmt').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === s.format));
    $$('#ratios .chip').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === s.cropRatio));
    markSegmented('resizeMode', s.resizeMode);
    markSegmented('pdfPage', s.pdfPage);
    markSegmented('pngMode', s.pngMode);
    markSegmented('meta', s.meta);
    $('#pdfOptions').hidden = s.format !== 'pdf';
    $('#autoOptions').hidden = s.format !== 'auto';
    $('#pdfMerge').checked = s.pdfMerge;
    $('#mozjpeg').checked = s.mozjpeg;
    for (const key of ['autoPhoto', 'autoAlpha', 'autoGraphic']) $('#' + key).value = s[key];
    $$('.mode-body').forEach((el) => { el.hidden = el.dataset.mode !== s.resizeMode; });
    $('[data-mode-hint="none"]').hidden = s.resizeMode !== 'none';

    const f = FMT[s.format];
    const flexible = f.id === 'auto' || f.id === 'original'; // pueden salir varios formatos
    const lossy = f.lossy || flexible;
    $('#formatHint').textContent = f.desc;
    $('#qualityBlock').hidden = !lossy;
    $('#pngOptions').hidden = !(f.id === 'png' || flexible);
    $('#pngColorsRow').hidden = s.pngMode !== 'palette';
    $('#mozBlock').hidden = !(f.id === 'jpeg' || f.id === 'pdf' || flexible);
    $('#losslessHint').hidden = lossy || f.id === 'png';
    $('#metaHint').textContent = s.meta === 'strip'
      ? 'Se eliminan la cámara, la fecha, la ubicación y el resto de datos.'
      : 'Se conservan al guardar en JPG, PNG o WebP a partir de fotos JPG.' + (s.meta === 'keep-nogps' ? ' La ubicación GPS se borra.' : '');

    if (!fromInput) {
      $('#quality').value = s.quality;
      $('#percent').value = s.percent;
      $('#maxW').value = s.maxW || '';
      $('#maxH').value = s.maxH || '';
      $('#exactW').value = s.exactW || '';
      $('#exactH').value = s.exactH || '';
      $('#targetKB').value = s.targetKB || '';
      $('#pngColors').value = s.pngColors;
      $('#bg').value = s.bg;
      $('#pattern').value = s.pattern;
    }
    $('#targetOn').checked = s.targetOn;
    $('#cover').checked = s.cover;
    $('#qualityOut').textContent = s.quality + '%';
    $('#percentOut').textContent = s.percent + '%';
    $('#pngColorsOut').textContent = s.pngColors;
    $('#quality').style.setProperty('--fill', s.quality + '%');
    $('#percent').style.setProperty('--fill', ((s.percent - 5) / 195 * 100) + '%');
    $('#pngColors').style.setProperty('--fill', ((s.pngColors - 2) / 254 * 100) + '%');
  }

  let cardTimer;
  function changed(fromInput) {
    version++;
    saveSettings();
    syncPanel(fromInput);
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => {
      items.forEach((it) => { if (it.status !== 'loading' && it.status !== 'working') updateCard(it); });
      refreshChrome();
    }, fromInput ? 120 : 0);
  }

  /* ---------- Editor: recortar, girar y voltear ---------- */

  // El editor trabaja sobre una copia de la orientación (m) hasta pulsar Aplicar
  const crop = { it: null, ratio: 'free', rect: null, W: 0, H: 0, m: IDENTITY, ow: 0, oh: 0 };
  const MIN = 24;

  function buildCropDialog() {
    const opts = [{ id: 'free', label: 'Libre' }, { id: 'original', label: 'Original' }].concat(RATIOS.slice(1));
    $('#cropRatios').innerHTML = opts.map((r) => `<button type="button" class="chip" data-v="${r.id}">${r.label}</button>`).join('');
    $('#cropRatios').addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      setCropRatio(b.dataset.v, true);
    });
    $('#cropTools').addEventListener('click', (e) => {
      const b = e.target.closest('[data-op]');
      if (b) rotateInEditor(b.dataset.op);
    });

    const box = $('#cropBox');
    let drag = null;
    box.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      box.setPointerCapture(e.pointerId);
      drag = { mode: e.target.dataset.h || 'move', x: e.clientX, y: e.clientY, start: Object.assign({}, crop.rect) };
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const next = drag.mode === 'move' ? moveRect(drag.start, dx, dy) : resizeRect(drag.start, drag.mode, dx, dy);
      if (next) { crop.rect = next; drawCropBox(); }
    });
    const end = () => { drag = null; };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);

    $('#cropApply').addEventListener('click', () => {
      const { it, W, H } = crop;
      const n = normalizedCrop();
      const full = n.w * W >= W - 1 && n.h * H >= H - 1;
      $('#cropDialog').close();
      setOrientation(it, crop.m, full ? null : n);
    });
    $('#cropReset').addEventListener('click', () => {
      crop.m = IDENTITY;
      drawEditorImage();
      requestAnimationFrame(() => { measureCrop(); setCropRatio('free', true); });
    });

    window.addEventListener('resize', () => {
      if (!$('#cropDialog').open) return;
      const n = normalizedCrop();
      measureCrop();
      denormalizeCrop(n);
    });
  }

  function normalizedCrop() {
    const { rect, W, H } = crop;
    return { x: rect.x / W, y: rect.y / H, w: rect.w / W, h: rect.h / H };
  }
  function denormalizeCrop(n) {
    crop.rect = { x: n.x * crop.W, y: n.y * crop.H, w: n.w * crop.W, h: n.h * crop.H };
    drawCropBox();
  }

  /* Dibuja la imagen del editor (reducida a ≤1600 px) con la orientación provisional. */
  function drawEditorImage() {
    const it = crop.it;
    const k = Math.min(1, 1600 / Math.max(it.baseW, it.baseH));
    const src = drawOriented(it.img, crop.m, it.baseW, it.baseH, k);
    const cv = $('#cropCanvas');
    cv.width = src.width; cv.height = src.height;
    cv.getContext('2d').drawImage(src, 0, 0);
    const o = orientedSize(it, crop.m);
    crop.ow = o.w; crop.oh = o.h;
    $('#cropName').textContent = `${it.file.name} · ${o.w}×${o.h}`;
  }

  function rotateInEditor(op) {
    const n = normalizedCrop();
    crop.m = mul(OPS[op], crop.m);
    drawEditorImage();
    requestAnimationFrame(() => {
      measureCrop();
      if (crop.ratio !== 'free') setCropRatio(crop.ratio, true);
      else denormalizeCrop(transformRect(n, OPS[op]));
    });
  }

  function measureCrop() {
    const cv = $('#cropCanvas');
    crop.W = cv.clientWidth;
    crop.H = cv.clientHeight;
  }

  function openCrop(it) {
    if (!usable(it)) return;
    crop.it = it;
    crop.m = it.m;
    drawEditorImage();
    $('#cropDialog').showModal();
    requestAnimationFrame(() => {
      measureCrop();
      if (it.crop) {
        crop.ratio = 'free';
        markCropRatio();
        denormalizeCrop(it.crop);
      } else {
        setCropRatio(settings.cropRatio !== 'none' ? settings.cropRatio : 'free', true);
      }
    });
  }

  function markCropRatio() {
    $$('#cropRatios .chip').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === crop.ratio));
  }

  function currentRatio() {
    if (crop.ratio === 'free') return 0;
    return ratioValue(crop.ratio, crop.ow, crop.oh);
  }

  function setCropRatio(id, reset) {
    crop.ratio = id;
    markCropRatio();
    const r = currentRatio();
    if (reset || r) {
      const full = { x: 0, y: 0, w: crop.W, h: crop.H };
      crop.rect = r ? centerCrop(full, r) : full;
    }
    drawCropBox();
  }

  function moveRect(s, dx, dy) {
    return {
      x: Math.min(Math.max(0, s.x + dx), crop.W - s.w),
      y: Math.min(Math.max(0, s.y + dy), crop.H - s.h),
      w: s.w, h: s.h,
    };
  }

  function resizeRect(s, dir, dx, dy) {
    const W = crop.W, H = crop.H, r = currentRatio();
    let x1 = s.x, y1 = s.y, x2 = s.x + s.w, y2 = s.y + s.h;
    if (dir.includes('w')) x1 = Math.min(Math.max(0, x1 + dx), x2 - MIN);
    if (dir.includes('e')) x2 = Math.max(Math.min(W, x2 + dx), x1 + MIN);
    if (dir.includes('n')) y1 = Math.min(Math.max(0, y1 + dy), y2 - MIN);
    if (dir.includes('s')) y2 = Math.max(Math.min(H, y2 + dy), y1 + MIN);
    let x = x1, y = y1, w = x2 - x1, h = y2 - y1;

    if (r) {
      if (dir === 'n' || dir === 's') {
        w = h * r; x = s.x + s.w / 2 - w / 2;
      } else if (dir === 'e' || dir === 'w') {
        h = w / r; y = s.y + s.h / 2 - h / 2;
      } else {
        // esquina: manda el eje que más se ha movido
        if (Math.abs(dx) >= Math.abs(dy) * r) h = w / r; else w = h * r;
        x = dir.includes('w') ? x2 - w : x1;
        y = dir.includes('n') ? y2 - h : y1;
      }
      const eps = 0.5;
      if (x < -eps || y < -eps || x + w > W + eps || y + h > H + eps || w < MIN || h < MIN) return null;
    }
    return { x, y, w, h };
  }

  function drawCropBox() {
    const { rect, W, H } = crop;
    if (!rect) return;
    const box = $('#cropBox');
    box.style.left = rect.x + 'px';
    box.style.top = rect.y + 'px';
    box.style.width = rect.w + 'px';
    box.style.height = rect.h + 'px';
    $('#cropSize').textContent = `${Math.round(rect.w / W * crop.ow)} × ${Math.round(rect.h / H * crop.oh)}`;
  }

  /* ---------- Comparador antes / después ---------- */

  const cmp = { x: 0.5, zoom: false, afterUrl: null };

  function buildCompareDialog() {
    const wrap = $('#cmpWrap');
    const stage = $('#cmpStage');
    let drag = null;
    wrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      wrap.setPointerCapture(e.pointerId);
      // Con zoom, arrastrar fuera del tirador desplaza la imagen
      const pan = cmp.zoom && !e.target.closest('.cmp-handle');
      drag = { pan, x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      if (!pan) setCompareX(e.clientX);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.pan) {
        stage.scrollLeft = drag.sl - (e.clientX - drag.x);
        stage.scrollTop = drag.st - (e.clientY - drag.y);
      } else {
        setCompareX(e.clientX);
      }
    });
    const end = () => { drag = null; };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    $('#cmpRange').addEventListener('input', (e) => applyCompareX(e.target.value / 100));
    $('#cmpZoom').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) setCompareZoom(b.dataset.v === '100');
    });
    $('#cmpDialog').addEventListener('close', () => {
      if (cmp.afterUrl) { URL.revokeObjectURL(cmp.afterUrl); cmp.afterUrl = null; }
      $('#cmpAfter').removeAttribute('src');
    });
  }

  function setCompareX(clientX) {
    const r = $('#cmpWrap').getBoundingClientRect();
    applyCompareX(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  }

  function applyCompareX(x) {
    cmp.x = x;
    const pct = (x * 100).toFixed(2) + '%';
    $('#cmpAfter').style.clipPath = `inset(0 0 0 ${pct})`;
    $('#cmpLine').style.left = pct;
    $('#cmpRange').value = Math.round(x * 100);
    $('#cmpRange').style.setProperty('--fill', pct);
  }

  function setCompareZoom(on) {
    cmp.zoom = on;
    $('#cmpWrap').classList.toggle('fit', !on);
    markSegmented('cmpZoom', on ? '100' : 'fit');
    if (on) {
      // Centra la vista en la línea divisoria
      requestAnimationFrame(() => {
        const stage = $('#cmpStage');
        const wrap = $('#cmpWrap');
        stage.scrollLeft = wrap.offsetLeft + wrap.offsetWidth * cmp.x - stage.clientWidth / 2;
        stage.scrollTop = wrap.offsetTop + (wrap.offsetHeight - stage.clientHeight) / 2;
      });
    }
  }

  function openCompare(it) {
    const r = it.result;
    if (!r) return;
    const s = settings;
    const g = geometry(it, s);
    // "Antes": la misma zona y tamaño, sin comprimir
    const before = Pipeline.render(orientedSource(it), g, false, s.bg);
    const cv = $('#cmpBefore');
    cv.width = g.dw; cv.height = g.dh;
    cv.getContext('2d').drawImage(before, 0, 0);

    const afterBlob = r.fmtId === 'pdf' ? pdfPages.get(r.blob).jpeg : r.blob;
    cmp.afterUrl = URL.createObjectURL(afterBlob);
    $('#cmpAfter').src = cmp.afterUrl;

    const diff = Math.round((1 - r.blob.size / it.file.size) * 100);
    $('#cmpTitle').textContent = it.file.name;
    $('#cmpInfo').textContent = `${g.dw}×${g.dh} px`;
    $('#cmpLabelBefore').textContent = `Original · ${fmtBytes(it.file.size)}`;
    $('#cmpLabelAfter').textContent = `${r.fmt} · ${fmtBytes(r.blob.size)} (${diff >= 0 ? '−' : '+'}${Math.abs(diff)}%)`;
    $('#cmpDialog').showModal();
    setCompareZoom(false);
    applyCompareX(0.5);
  }

  /* ---------- Entrada de archivos ---------- */

  function bindInput() {
    const dz = $('#dropzone');
    const input = $('#fileInput');
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    $('#addMoreBtn').addEventListener('click', () => input.click());
    $('#clearBtn').addEventListener('click', () => { if (!busy) clearAll(); });
    $('#rotateAllBtn').addEventListener('click', () => {
      if (busy) return;
      items.filter(usable).forEach((it) => rotateItem(it, 'cw'));
      refreshChrome();
    });
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });

    let depth = 0;
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
      depth++;
      document.body.classList.add('dragging');
    });
    window.addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (!depth) document.body.classList.remove('dragging');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    window.addEventListener('paste', (e) => {
      const files = Array.from(e.clipboardData ? e.clipboardData.files : []);
      if (files.length) {
        addFiles(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `pegada-${Date.now()}-${i + 1}.png`, { type: f.type }))));
      }
    });

    $('#processBtn').addEventListener('click', processAll);
    $('#zipBtn').addEventListener('click', downloadAll);
  }

  /* ---------- Inicio ---------- */

  (async function init() {
    await detectSupport();
    if (!supported[settings.format]) settings.format = supported.webp ? 'webp' : 'jpeg';
    buildPanel();
    buildCropDialog();
    buildCompareDialog();
    bindInput();
    syncPanel();
    refreshChrome();
    initPool(); // arranca los Workers mientras se eligen las imágenes
  })();
})();
