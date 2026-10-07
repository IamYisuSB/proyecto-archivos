(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const t = (s, p) => I18N.t(s, p);

  const APP_VERSION = '4.3.0';

  // Destino de los informes de problemas: se configura en config.js
  const CONFIG = window.PIXELOTE_CONFIG || {};

  // Últimos errores, para adjuntarlos al informe de problemas
  const errorLog = [];
  function logError(msg) {
    errorLog.push(`${new Date().toISOString().slice(11, 19)} ${String(msg).slice(0, 300)}`);
    if (errorLog.length > 15) errorLog.shift();
  }
  window.addEventListener('error', (e) => logError(e.message));
  window.addEventListener('unhandledrejection', (e) => logError(e.reason && e.reason.message ? e.reason.message : e.reason));
  const consoleError = console.error.bind(console);
  console.error = (...args) => {
    logError(args.map((a) => (a && a.message) || a).join(' '));
    consoleError(...args);
  };

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
    multiW: '400, 800, 1600',
    cropRatio: 'none', bg: '#ffffff', pattern: '{nombre}',
    pdfMerge: true, pdfPage: 'fit',
    pngMode: 'lossless', pngColors: 256, mozjpeg: true, meta: 'strip',
    autoPhoto: 'webp', autoAlpha: 'webp', autoGraphic: 'png',
    wmOn: false, wmType: 'text', wmText: '© Pixelote', wmColor: '#ffffff', wmPos: 'br', wmSize: 5, wmOpacity: 60,
  };
  const STORE_KEY = 'pixelote.settings.v1';
  const PRESETS_KEY = 'pixelote.presets';
  const LOGO_KEY = 'pixelote.logo';
  const THEME_KEY = 'pixelote.theme';

  /* ---------- Estado ---------- */

  let settings = loadSettings();
  let version = 0; // sube cada vez que cambian los ajustes
  const items = [];
  const supported = {};
  let nativeAvif = false;
  let wasmOK = false; // ¿puede ejecutar los códecs WebAssembly (AVIF y MozJPEG)?
  const pdfPages = new WeakMap(); // PDF de una página → su JPEG, para unirlos después
  const relDirs = new WeakMap(); // archivo → carpeta de origen (al soltar carpetas)
  let myPresets = loadJSON(PRESETS_KEY, []);
  let logoImg = null;
  let busy = false;
  let nextId = 1;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* almacenamiento no disponible */ }
    return fallback;
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  function loadSettings() {
    return Object.assign({}, DEFAULTS, loadJSON(STORE_KEY, {}));
  }
  function saveSettings() {
    saveJSON(STORE_KEY, settings);
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
  function plural(n, one, many) {
    return t(n === 1 ? one : many, { n });
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
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
    wasmOK = canRunWasm();
    // Sin AVIF propio se usa el codificador WebAssembly, si el navegador lo permite
    supported.avif = nativeAvif || wasmOK;
  }

  /* Prepara un módulo WebAssembly vacío (8 bytes, sin descargar nada). Falla si
   * el navegador no tiene WebAssembly o si su política de seguridad lo bloquea
   * (por ejemplo, Safari anterior a la 16 no entiende 'wasm-unsafe-eval'). */
  function canRunWasm() {
    try {
      if (typeof WebAssembly !== 'object' || typeof WebAssembly.Module !== 'function') return false;
      const mod = new WebAssembly.Module(Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      new WebAssembly.Instance(mod);
      return true;
    } catch (_) {
      return false;
    }
  }

  /* Formato que se puede generar de verdad: si el elegido no está disponible
   * (p. ej. AVIF en un navegador sin WebAssembly), WebP o, si tampoco, JPG. */
  function usableFormat(id) {
    if (supported[id]) return FMT[id];
    return supported.webp ? FMT.webp : FMT.jpeg;
  }

  function formatDesc(f) {
    let d = t(f.desc);
    if (f.id === 'avif' && !nativeAvif) d += ' ' + t('Este navegador no lo genera, así que se descargará un codificador la primera vez (y es más lento).');
    return d;
  }

  /* Ajustes de una imagen: los generales con sus excepciones (formato, calidad, ancho). */
  function eff(it, s = settings) {
    const o = it.ov;
    if (!o) return s;
    const r = Object.assign({}, s);
    if (o.format) r.format = o.format;
    if (o.quality != null) r.quality = o.quality;
    if (o.maxW) { r.resizeMode = 'max'; r.maxW = o.maxW; r.maxH = 0; }
    return r;
  }

  /* Formato real de salida para una imagen (resuelve "Auto" y "Original"). */
  function outFormat(it, s = settings) {
    if (s.format === 'auto') {
      const pick = { photo: s.autoPhoto, alpha: s.autoAlpha, graphic: s.autoGraphic }[it.cls || 'photo'];
      return usableFormat(FMT[pick] ? pick : 'webp');
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
  function mul(a, m) {
    return [a[0] * m[0] + a[2] * m[1], a[1] * m[0] + a[3] * m[1], a[0] * m[2] + a[2] * m[3], a[1] * m[2] + a[3] * m[3]];
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
  /* Lleva un recorte normalizado (0–1) al espacio girado por op. */
  function transformRect(r, op) {
    const p = placement(op, 1, 1);
    const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]
      .map(([x, y]) => [op[0] * x + op[2] * y + p.e, op[1] * x + op[3] * y + p.f]);
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
    drawWmPreview();
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

  function parseWidths(str) {
    const ws = String(str).split(/[\s,;]+/).map(Number).filter((n) => n >= 1 && n <= 20000).map(Math.round);
    return Array.from(new Set(ws)).sort((a, b) => a - b).slice(0, 8);
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
    } else if (s.resizeMode === 'max' || s.resizeMode === 'multi') {
      const widths = s.resizeMode === 'multi' ? parseWidths(s.multiW) : null;
      const mw = widths ? (widths.length ? widths[widths.length - 1] : Infinity) : s.maxW > 0 ? s.maxW : Infinity;
      const mh = widths ? Infinity : s.maxH > 0 ? s.maxH : Infinity;
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

  /* Anchos a generar en el modo "Varios" (solo los que no agrandan), o null. */
  function variantWidths(it, s) {
    if (s.resizeMode !== 'multi') return null;
    const fmt = outFormat(it, s);
    if (fmt.id === 'pdf' || fmt.id === 'ico') return null;
    const srcW = geometry(it, Object.assign({}, s, { resizeMode: 'none' })).sw;
    const ws = parseWidths(s.multiW).filter((w) => w <= srcW);
    return ws.length ? ws : [srcW];
  }

  function outputName(it, index, g, fmt, s, suffix = '') {
    const total = items.length;
    const n = String(index + 1).padStart(String(total).length, '0');
    const pattern = s.pattern.trim() || '{nombre}';
    let name = pattern
      .replace(/\{nombre\}/gi, baseName(it.file.name))
      .replace(/\{n\}/gi, n)
      .replace(/\{ancho\}/gi, g.dw)
      .replace(/\{alto\}/gi, g.dh);
    if (suffix && !/\{ancho\}/i.test(pattern)) name += suffix;
    name = name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'imagen';
    return name + '.' + fmt.ext;
  }

  /* ---------- Marca de agua ---------- */

  function wmSpec(s) {
    return { type: s.wmType, text: s.wmText, color: s.wmColor, pos: s.wmPos, size: s.wmSize, opacity: s.wmOpacity, logo: logoImg };
  }
  function wmActive(s) {
    return s.wmOn && (s.wmType === 'text' ? !!String(s.wmText).trim() : !!logoImg);
  }

  function loadLogo(dataUrl) {
    return new Promise((res) => {
      if (!dataUrl) { res(null); return; }
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = dataUrl;
    });
  }

  async function setLogoFromFile(file) {
    const { img, url } = await loadImage(file);
    // Se reduce a 1024 px como mucho para que quepa en el almacenamiento del navegador
    const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = makeCanvas(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const dataUrl = c.toDataURL('image/png');
    logoImg = await loadLogo(dataUrl);
    if (!saveJSON(LOGO_KEY, dataUrl)) toast(t('El logo se usará ahora, pero no se recordará la próxima vez (es muy grande).'));
    settings.wmType = 'logo';
    changed();
  }

  /* Vista previa de la marca de agua sobre la primera imagen (o un fondo de ejemplo). */
  function drawWmPreview() {
    const cv = $('#wmPreview');
    if (!cv || $('#wmBody').hidden) return;
    const it = items.find(usable);
    const W = 200;
    const H = it ? Math.max(90, Math.min(200, Math.round(W * it.h / it.w))) : 130;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    if (it) {
      const src = it.thumbUrl ? null : it.img;
      if (src) ctx.drawImage(src, 0, 0, W, H);
      else {
        const im = new Image();
        im.onload = () => { ctx.drawImage(im, 0, 0, W, H); paintWm(); };
        im.src = it.thumbUrl;
        return;
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#7aa7d9'); g.addColorStop(1, '#3d5a80');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    paintWm();
    function paintWm() {
      if (wmActive(settings)) Pipeline.applyWatermark(cv, wmSpec(settings));
    }
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
      mozjpeg: s.mozjpeg && wasmOK, nativeAvif, exif: null, wm: wmActive(s) ? wmSpec(s) : null,
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
        const timer = setTimeout(() => res(false), 5000);
        w.onmessage = (e) => { if (e.data === 'pong') { clearTimeout(timer); res(true); } };
        w.onerror = (e) => { e.preventDefault(); clearTimeout(timer); res(false); };
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
      const transfer = [job.source];
      if (job.wm && job.wm.logo) transfer.push(job.wm.logo);
      worker.postMessage({ id, job }, transfer);
    });
  }

  async function runPipeline(it, s, worker) {
    if (worker) {
      try {
        const job = buildJob(it, s, await createImageBitmap(orientedSource(it)));
        if (job.wm && job.wm.logo) job.wm.logo = await createImageBitmap(job.wm.logo);
        return await runInWorker(worker, job);
      } catch (e) {
        console.warn('No se pudo procesar en segundo plano; se reintenta en la página:', e.message);
      }
    }
    return Pipeline.run(buildJob(it, s, orientedSource(it)));
  }

  async function processItem(it, base, worker, runVersion) {
    const s = eff(it, base);
    const fmt = outFormat(it, s);
    const widths = variantWidths(it, s);
    const runs = widths ? widths.map((w) => Object.assign({}, s, { resizeMode: 'max', maxW: w, maxH: 0 })) : [s];
    const index = items.indexOf(it);
    const variants = [];
    for (const sv of runs) {
      const r = await runPipeline(it, sv, worker);
      const g = geometry(it, sv);
      variants.push({
        blob: r.blob, url: URL.createObjectURL(r.blob), name: outputName(it, index, g, fmt, sv, widths ? `-${g.dw}w` : ''),
        w: g.dw, h: g.dh, page: r.page, missed: r.missed, mozFailed: r.mozFailed,
      });
    }
    const main = variants[variants.length - 1];
    if (main.page) pdfPages.set(main.blob, main.page);
    return {
      blob: main.blob, url: main.url, name: main.name, fmt: fmt.label, fmtId: fmt.id, version: runVersion,
      variants: widths ? variants : null,
      missed: variants.some((v) => v.missed), mozFailed: variants.some((v) => v.mozFailed),
    };
  }

  function revokeResult(r) {
    if (!r) return;
    (r.variants || [r]).forEach((v) => URL.revokeObjectURL(v.url));
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
    btn.textContent = t('Preparando…');

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
          revokeResult(it.result);
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
        btn.textContent = t('Procesando {i} de {n}…', { i: Math.min(done + 1, todo.length), n: todo.length });
      }
    }
    btn.textContent = t('Procesando {i} de {n}…', { i: 1, n: todo.length });
    await Promise.all(lanes.map(lane));

    busy = false;
    setTimeout(() => { $('#progress').hidden = true; }, 600);
    refreshChrome();
    if (failed) {
      onAppError(plural(failed, 'No se pudo convertir {n} imagen.', 'No se pudieron convertir {n} imágenes.'),
        `Falló la conversión de ${failed} de ${todo.length} imágenes (formato: ${FMT[s.format].label}, tamaño: ${s.resizeMode}). ` +
        `Último error: ${errorLog[errorLog.length - 1] || '—'}`);
    }
    let msg = failed
      ? t('Listo, pero {n} no se pudieron convertir', { n: failed })
      : plural(done, '¡Listo! {n} imagen convertida', '¡Listo! {n} imágenes convertidas');
    if (mozFailed) msg += ' ' + t('(sin MozJPEG: hace falta internet la primera vez)');
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
    if (!it.kind) throw new Error(t('Tu navegador no puede leer este archivo'));
    const label = Codecs.LABELS[it.kind];
    it.loadingMsg = t('Decodificando {f}…', { f: label });
    updateCard(it);
    let blob;
    try {
      blob = await Codecs.decode(it.file, it.kind);
    } catch (e) {
      console.error(e);
      if (/descargar/.test(e.message) || !navigator.onLine) {
        throw new Error(it.kind === 'heic' ? t('Para leer HEIC hace falta conexión a internet') : t('Para leer {f} hace falta internet la primera vez', { f: label }));
      }
      onAppError(t('No se pudo leer un archivo {f}.', { f: label }), `Falló la lectura de un archivo ${label}: ${e.message}`);
      if (/^Este RAW/.test(e.message)) throw new Error(t(e.message));
      throw new Error(t('No se pudo leer este {f}', { f: label }));
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

  /* Carpeta de origen de un archivo: la de la carpeta soltada o la del selector de carpetas. */
  function relDirOf(f) {
    if (relDirs.has(f)) return relDirs.get(f);
    const p = f.webkitRelativePath || '';
    return p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || Codecs.kindOf(f) || /\.(bmp|ico|svg|avif|webp)$/i.test(f.name));
    if (!files.length) { toast(t('No he encontrado imágenes en lo que has soltado')); return; }

    for (const file of files) {
      const it = { id: nextId++, file, kind: Codecs.kindOf(file), status: 'loading', crop: null, result: null, m: IDENTITY, ov: null, relDir: relDirOf(file) };
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
    drawWmPreview();
  }

  /* Archivos de lo soltado, entrando en las carpetas (y recordando su ruta). */
  async function filesFromDrop(dt) {
    const entries = Array.from(dt.items || [])
      .filter((i) => i.kind === 'file' && i.webkitGetAsEntry)
      .map((i) => i.webkitGetAsEntry())
      .filter(Boolean);
    if (!entries.some((e) => e.isDirectory)) return Array.from(dt.files);
    const out = [];
    async function walk(entry, dir) {
      if (entry.isFile) {
        const f = await new Promise((res, rej) => entry.file(res, rej));
        relDirs.set(f, dir);
        out.push(f);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const sub = dir ? dir + '/' + entry.name : entry.name;
        for (;;) {
          const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
          if (!batch.length) break;
          for (const e of batch) await walk(e, sub);
        }
      }
    }
    for (const e of entries) await walk(e, '');
    return out;
  }

  function removeItem(it) {
    const i = items.indexOf(it);
    if (i < 0) return;
    items.splice(i, 1);
    if (it.url) URL.revokeObjectURL(it.url);
    if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
    revokeResult(it.result);
    it.el.remove();
    refreshChrome();
    drawWmPreview();
  }

  function clearAll() {
    while (items.length) removeItem(items[0]);
  }

  /* ---------- Orden del lote ---------- */

  function syncOrderFromDom() {
    const order = $$('#grid > .item');
    items.sort((a, b) => order.indexOf(a.el) - order.indexOf(b.el));
    // La numeración {n} cambia con el orden
    if (/\{n\}/i.test(settings.pattern)) items.forEach(markStale);
    items.forEach((it) => { if (usable(it) && it.status !== 'working') updateCard(it); });
    refreshChrome();
  }

  function moveItem(it, where) {
    const i = items.indexOf(it);
    let j = where === 'first' ? 0 : where === 'last' ? items.length - 1 : i + Number(where);
    j = Math.max(0, Math.min(items.length - 1, j));
    if (i === j) return;
    items.splice(i, 1);
    items.splice(j, 0, it);
    const grid = $('#grid');
    items.forEach((x) => grid.appendChild(x.el));
    syncOrderFromDom();
  }

  function bindReorder() {
    const grid = $('#grid');
    let dragged = null;
    grid.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.item');
      if (!li || busy) { e.preventDefault(); return; }
      dragged = li;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-pixelote', '1');
      li.classList.add('dragging-item');
    });
    grid.addEventListener('dragover', (e) => {
      if (!dragged) return;
      e.preventDefault();
      const over = e.target.closest('.item');
      if (!over || over === dragged) return;
      const r = over.getBoundingClientRect();
      grid.insertBefore(dragged, e.clientX - r.left > r.width / 2 ? over.nextSibling : over);
    });
    grid.addEventListener('dragend', () => {
      if (!dragged) return;
      dragged.classList.remove('dragging-item');
      dragged = null;
      syncOrderFromDom();
    });
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
      else if (act === 'settings') openItemDialog(it);
    });
    return li;
  }

  function updateCard(it) {
    const li = it.el;
    const name = esc(it.file.name);
    const origSize = fmtBytes(it.file.size);
    li.draggable = false;

    if (it.status === 'loading') {
      li.className = 'item loading';
      li.innerHTML = `<div class="thumb skeleton"></div><div class="meta"><div class="name" title="${name}">${name}</div><div class="sub">${esc(it.loadingMsg || t('Cargando…'))}</div></div>`;
      return;
    }
    if (it.status === 'invalid') {
      li.className = 'item invalid';
      li.innerHTML = `
        <div class="thumb broken" aria-hidden="true">⚠</div>
        <div class="meta">
          <div class="name" title="${name}">${name}</div>
          <div class="sub err">${esc(it.errorMsg || t('Tu navegador no puede leer este archivo'))}</div>
        </div>
        <button class="icon-btn rm" data-act="remove" title="${esc(t('Quitar'))}" aria-label="${esc(t('Quitar'))}">✕</button>`;
      return;
    }

    li.draggable = !busy;
    const s = eff(it);
    const g = geometry(it, s);
    const fmt = outFormat(it, s);
    const widths = variantWidths(it, s);
    const r = it.result;
    const stale = r && r.version !== version;
    let resultHtml = '';
    if (it.status === 'working') {
      resultHtml = `<div class="result working"><span class="spinner"></span> ${esc(t('Procesando…'))}</div>`;
    } else if (it.status === 'error') {
      resultHtml = `<div class="result err">${esc(t('No se pudo convertir'))}</div>`;
    } else if (r) {
      const diff = Math.round((1 - r.blob.size / it.file.size) * 100);
      const badge = diff > 0
        ? `<span class="badge good">−${diff}%</span>`
        : `<span class="badge bad">+${Math.abs(diff)}%</span>`;
      const canCompare = !stale && VIEWABLE.includes(r.fmtId);
      const variantsHtml = r.variants && r.variants.length > 1
        ? `<div class="variants">${r.variants.map((v) => `<a href="${v.url}" download="${esc(v.name)}" title="${esc(v.name)}">${v.w}px · ${fmtBytes(v.blob.size)}</a>`).join('')}</div>`
        : '';
      resultHtml = `
        <div class="result ${stale ? 'stale' : ''}">
          <div class="res-line"><b>${esc(r.fmt)}</b> · ${fmtBytes(r.blob.size)} ${badge}</div>
          ${variantsHtml}
          ${r.missed ? `<div class="sub warn">${esc(t('No se alcanzó el tamaño objetivo'))}</div>` : ''}
          ${stale ? `<div class="sub warn">${esc(t('Ajustes cambiados: vuelve a convertir'))}</div>` : ''}
          <div class="res-actions">
            ${canCompare ? `<button type="button" class="btn small ghost" data-act="compare" title="${esc(t('Comparar antes y después'))}">⇆ ${esc(t('Comparar'))}</button>` : ''}
            <a class="btn small primary dl" href="${r.url}" download="${esc(r.name)}">${esc(t('Descargar'))}</a>
          </div>
        </div>`;
    }

    const gpsTitle = settings.meta === 'keep' ? t('Contiene ubicación GPS y se conservará') : t('Contiene ubicación GPS (se eliminará)');
    const tags = [
      it.ov ? `<span class="tag">⚙ ${esc(t('propios'))}</span>` : '',
      it.crop ? `<span class="tag">✂ ${esc(t('recorte'))}</span>` : '',
      !isIdentity(it.m) ? `<span class="tag">⟳ ${esc(t('girada'))}</span>` : '',
      it.gps ? `<span class="tag" title="${esc(gpsTitle)}">📍 GPS</span>` : '',
    ].join('');
    const auto = s.format === 'auto' && it.cls ? ` · ${esc(t(CLASS_LABEL[it.cls]))}` : '';
    const dims = widths ? `${widths.join(' · ')} px` : `${g.dw}×${g.dh}`;
    const folder = it.relDir ? ` title="📁 ${esc(it.relDir)}"` : '';

    li.className = 'item' + (r && !stale ? ' done' : '');
    li.innerHTML = `
      <div class="thumb">
        <img src="${it.thumbUrl || it.url}" alt="" loading="lazy" draggable="false">
        <div class="tags">${tags}</div>
        <div class="thumb-actions">
          <button class="icon-btn" data-act="settings" title="${esc(t('Ajustes de esta imagen'))}" aria-label="${esc(t('Ajustes de esta imagen'))}">⚙</button>
          <button class="icon-btn" data-act="rotate" title="${esc(t('Girar 90°'))}" aria-label="${esc(t('Girar 90°'))}">⟳</button>
          <button class="icon-btn" data-act="crop" title="${esc(t('Recortar y girar'))}" aria-label="${esc(t('Recortar y girar'))}">✂</button>
          <button class="icon-btn" data-act="remove" title="${esc(t('Quitar'))}" aria-label="${esc(t('Quitar'))}">✕</button>
        </div>
      </div>
      <div class="meta">
        <div class="name"${folder || ` title="${name}"`}>${it.relDir ? '📁 ' : ''}${name}</div>
        <div class="sub">${it.kind ? `<span class="src-tag">${Codecs.LABELS[it.kind]}</span> ` : ''}${it.w}×${it.h} · ${origSize}</div>
        <div class="sub arrow">→ ${dims} · ${esc(fmt.label)}${auto}</div>
      </div>
      ${resultHtml}`;
  }

  function updateAllCards() {
    items.forEach((it) => { if (it.status !== 'working') updateCard(it); });
  }

  /* ---------- Toolbar, resumen y botones ---------- */

  function doneItems() {
    return items.filter((i) => i.result && i.result.version === version);
  }

  /* Todos los archivos que se descargan, con su carpeta de origen si la hay. */
  function allOutputs(done) {
    return done.flatMap((it) => (it.result.variants || [it.result]).map((v) => ({
      name: (it.relDir ? it.relDir + '/' : '') + v.name, blob: v.blob,
    })));
  }

  function refreshChrome() {
    const valid = items.filter(usable);
    const has = items.length > 0;
    $('#dropzone').classList.toggle('compact', has);
    $('#toolbar').hidden = !has;
    $('#reorderHint').hidden = valid.length < 2;
    const total = items.reduce((a, i) => a + i.file.size, 0);
    $('#toolbarInfo').innerHTML = `<b>${items.length}</b> ${esc(t(items.length === 1 ? 'imagen' : 'imágenes'))} · ${fmtBytes(total)}`;
    $('#rotateAllBtn').disabled = busy || !valid.length;

    const btn = $('#processBtn');
    btn.disabled = busy || valid.length === 0;
    if (!busy) {
      const anyDone = items.some((i) => i.result);
      btn.textContent = !valid.length ? t('Convertir imágenes')
        : anyDone ? plural(valid.length, 'Volver a convertir {n} imagen', 'Volver a convertir {n} imágenes')
        : plural(valid.length, 'Convertir {n} imagen', 'Convertir {n} imágenes');
    }

    const done = doneItems();
    const outputs = done.length ? allOutputs(done) : [];
    $('#zipBtn').disabled = busy || done.length === 0;
    $('#saveFolderBtn').disabled = busy || done.length === 0;
    $('#zipLabel').textContent = outputs.length <= 1 ? t('Descargar')
      : mergePdf(done) ? t('Descargar PDF único ({n} páginas)', { n: done.length })
      : t('Descargar todo (.zip)');

    const sum = $('#summary');
    if (done.length && !busy) {
      const before = done.reduce((a, i) => a + i.file.size, 0);
      const after = done.reduce((a, i) => a + i.result.blob.size, 0);
      const pct = Math.round((1 - after / before) * 100);
      const extra = outputs.length > done.length
        ? `<div class="sum-item"><span>${esc(t('Archivos'))}</span><b>${outputs.length}</b></div>` : '';
      sum.hidden = false;
      sum.innerHTML = `
        <div class="sum-item"><span>${esc(t('Antes'))}</span><b>${fmtBytes(before)}</b></div>
        <div class="sum-arrow" aria-hidden="true">→</div>
        <div class="sum-item"><span>${esc(t('Después'))}</span><b>${fmtBytes(after)}</b></div>
        ${extra}
        <div class="sum-item big ${pct >= 0 ? 'good' : 'bad'}"><span>${esc(t(pct >= 0 ? 'Ahorro' : 'Aumento'))}</span><b>${Math.abs(pct)}%</b></div>`;
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
        n = name.replace(/(\.[^./]+)$/, `-${k}$1`);
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

  /* Lo que se descarga o se guarda: un PDF único, o todos los archivos sueltos. */
  async function finalFiles(done) {
    if (mergePdf(done) && done.length > 1) {
      return [{ name: 'imagenes-pixelote.pdf', blob: await Encoders.makePDF(done.map((i) => pdfPages.get(i.result.blob)), settings.pdfPage) }];
    }
    return uniqueNames(allOutputs(done));
  }

  async function downloadAll() {
    const done = doneItems();
    if (!done.length) return;
    $('#zipBtn').disabled = true;
    try {
      const files = await finalFiles(done);
      if (files.length === 1) { download(files[0].blob, files[0].name.split('/').pop()); return; }
      $('#zipLabel').textContent = t('Creando ZIP…');
      download(await Encoders.makeZip(files), 'imagenes-pixelote.zip');
    } finally {
      refreshChrome();
    }
  }

  /* Guarda directamente en una carpeta elegida (Chrome / Edge), sin sobrescribir. */
  async function saveToFolder() {
    const done = doneItems();
    if (!done.length) return;
    let dir;
    try {
      dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'pixelote-salida' });
    } catch (_) {
      return; // cancelado
    }
    $('#saveFolderBtn').disabled = true;
    let saved = 0;
    try {
      for (const f of await finalFiles(done)) {
        const parts = f.name.split('/');
        let d = dir;
        for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
        const fh = await d.getFileHandle(await freeName(d, parts[parts.length - 1]), { create: true });
        const w = await fh.createWritable();
        await w.write(f.blob);
        await w.close();
        saved++;
      }
      toast(plural(saved, '{n} archivo guardado en «{dir}»', '{n} archivos guardados en «{dir}»').replace('{dir}', () => dir.name));
    } catch (e) {
      console.error(e);
      toast(t('No se pudo guardar en la carpeta ({n} guardados)', { n: saved }));
    } finally {
      refreshChrome();
    }
  }

  async function freeName(dir, name) {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
    for (let k = 0; ; k++) {
      const candidate = k ? `${stem}-${k}${ext}` : name;
      try { await dir.getFileHandle(candidate); } catch (_) { return candidate; }
    }
  }

  /* ---------- Atajos personalizados ---------- */

  /* Solo se aceptan ajustes conocidos y del tipo correcto (los atajos pueden venir de fuera). */
  function sanitizePreset(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const name = String(obj.name || '').trim().slice(0, 40);
    const set = {};
    const src = obj.set && typeof obj.set === 'object' ? obj.set : {};
    for (const k of Object.keys(DEFAULTS)) {
      if (k in src && typeof src[k] === typeof DEFAULTS[k]) set[k] = src[k];
    }
    if (set.format && !FMT[set.format]) delete set.format;
    if (!name || !Object.keys(set).length) return null;
    return { name, set };
  }

  function savePresets() {
    saveJSON(PRESETS_KEY, myPresets);
    renderMyPresets();
  }

  function applyPreset(set, label) {
    if (set.format && !supported[set.format]) { toast(t('Tu navegador no puede generar {f}', { f: FMT[set.format].label })); return; }
    Object.assign(settings, set);
    changed();
    toast(t('Atajo aplicado: {name}', { name: label }));
  }

  function renderMyPresets() {
    $('#myPresets').innerHTML = myPresets.map((p, i) => `
      <div class="my-preset">
        <button type="button" class="preset-apply" data-apply="${i}" title="${esc(p.name)}">★ ${esc(p.name)}</button>
        <button type="button" class="mini" data-share="${i}" title="${esc(t('Compartir'))}" aria-label="${esc(t('Compartir'))}">🔗</button>
        <button type="button" class="mini" data-del="${i}" title="${esc(t('Borrar'))}" aria-label="${esc(t('Borrar'))}">✕</button>
      </div>`).join('');
  }

  function encodePreset(p) {
    const bytes = new TextEncoder().encode(JSON.stringify(p));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodePreset(str) {
    try {
      const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return sanitizePreset(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (_) {
      return null;
    }
  }

  let sharing = null;
  function openShare(p) {
    sharing = p;
    $('#shareName').textContent = p.name;
    $('#shareLink').value = location.href.split('#')[0] + '#atajo=' + encodePreset(p);
    $('#shareDialog').showModal();
    $('#shareLink').select();
  }

  function addPreset(p) {
    const i = myPresets.findIndex((x) => x.name === p.name);
    if (i >= 0) myPresets[i] = p; else myPresets.push(p);
    savePresets();
  }

  function bindPresets() {
    $('#presets').innerHTML = PRESETS.map((p, i) =>
      `<button type="button" class="preset" data-i="${i}"><span aria-hidden="true">${p.emoji}</span>${esc(t(p.label))}</button>`).join('');
    $('#presets').onclick = (e) => {
      const b = e.target.closest('.preset');
      if (b) applyPreset(PRESETS[+b.dataset.i].set, t(PRESETS[+b.dataset.i].label));
    };
    renderMyPresets();
    $('#myPresets').onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.apply != null) { const p = myPresets[+b.dataset.apply]; applyPreset(p.set, p.name); }
      else if (b.dataset.share != null) openShare(myPresets[+b.dataset.share]);
      else if (b.dataset.del != null) { myPresets.splice(+b.dataset.del, 1); savePresets(); }
    };
  }

  function bindPresetActions() {
    const form = $('#savePresetForm');
    $('#savePresetBtn').addEventListener('click', () => {
      form.hidden = false;
      $('#presetActions').hidden = true;
      $('#presetName').value = '';
      $('#presetName').focus();
    });
    const closeForm = () => { form.hidden = true; $('#presetActions').hidden = false; };
    $('#cancelPresetBtn').addEventListener('click', closeForm);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = sanitizePreset({ name: $('#presetName').value, set: Object.assign({}, settings) });
      if (!p) return;
      addPreset(p);
      closeForm();
      toast(t('Atajo «{name}» guardado', { name: p.name }));
    });

    $('#importPresetBtn').addEventListener('click', () => $('#presetFile').click());
    $('#presetFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      let p = null;
      try { p = sanitizePreset(JSON.parse(await f.text())); } catch (_) { /* no es JSON */ }
      if (!p) { toast(t('Ese archivo no es un atajo de Pixelote')); return; }
      addPreset(p);
      toast(t('Atajo «{name}» guardado', { name: p.name }));
    });

    $('#shareCopy').addEventListener('click', async () => {
      const input = $('#shareLink');
      try { await navigator.clipboard.writeText(input.value); } catch (_) { input.select(); document.execCommand('copy'); }
      toast(t('Enlace copiado'));
    });
    $('#shareFile').addEventListener('click', () => {
      if (!sharing) return;
      const blob = new Blob([JSON.stringify(sharing, null, 2)], { type: 'application/json' });
      download(blob, `atajo-${sharing.name.replace(/[\\/:*?"<>|\s]+/g, '-')}.json`);
    });
  }

  /* Atajo recibido por enlace (#atajo=…): se ofrece añadirlo. */
  function checkSharedPreset() {
    const m = location.hash.match(/^#atajo=([\w-]+)/);
    if (!m) return;
    history.replaceState(null, '', location.href.split('#')[0]);
    const p = decodePreset(m[1]);
    if (!p) { toast(t('El enlace del atajo no es válido')); return; }
    const banner = $('#sharedBanner');
    $('#sharedText').textContent = t('Te han compartido el atajo «{name}».', { name: p.name });
    banner.hidden = false;
    $('#sharedAdd').onclick = () => {
      addPreset(p);
      banner.hidden = true;
      applyPreset(p.set, p.name);
    };
    $('#sharedIgnore').onclick = () => { banner.hidden = true; };
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

  /* Partes del panel que dependen del idioma (se rehacen al cambiarlo). */
  function renderPanelLists() {
    $('#formats').innerHTML = FORMATS.map((f) => `
      <button type="button" role="radio" class="fmt" data-v="${f.id}" ${supported[f.id] ? '' : `disabled title="${esc(t('Tu navegador no puede generar este formato'))}"`}>
        <b>${esc(t(f.label))}</b>
        <small>${esc(t(f.id === 'auto' ? 'según imagen' : f.id === 'original' ? 'mismo formato' : f.lossy ? 'con pérdida' : 'sin pérdida'))}</small>
      </button>`).join('');
    $('#ratios').innerHTML = RATIOS.map((r) => `<button type="button" role="radio" class="chip" data-v="${r.id}">${esc(t(r.label))}</button>`).join('');
    bindPresets();
  }

  function buildPanel() {
    renderPanelLists();
    $('#formats').addEventListener('click', (e) => {
      const b = e.target.closest('.fmt');
      if (!b || b.disabled) return;
      settings.format = b.dataset.v;
      changed();
    });
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
    bindSegmented('wmType', 'wmType');
    bindSegmented('wmPos', 'wmPos');

    for (const key of ['autoPhoto', 'autoAlpha', 'autoGraphic']) {
      $('#' + key).addEventListener('change', (e) => { settings[key] = e.target.value; changed(); });
    }
    const numeric = ['quality', 'percent', 'maxW', 'maxH', 'exactW', 'exactH', 'targetKB', 'pngColors', 'wmSize', 'wmOpacity'];
    for (const key of numeric) {
      $('#' + key).addEventListener('input', (e) => {
        settings[key] = e.target.value === '' ? 0 : Number(e.target.value);
        changed(true);
      });
    }
    for (const key of ['targetOn', 'cover', 'pdfMerge', 'mozjpeg', 'wmOn']) {
      $('#' + key).addEventListener('change', (e) => { settings[key] = e.target.checked; changed(); });
    }
    for (const key of ['bg', 'pattern', 'multiW', 'wmText', 'wmColor']) {
      $('#' + key).addEventListener('input', (e) => { settings[key] = e.target.value; changed(true); });
    }

    $('#wmLogoBtn').addEventListener('click', () => $('#wmLogoFile').click());
    $('#wmLogoFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { await setLogoFromFile(f); } catch (_) { toast(t('No se pudo leer el logo')); }
    });
    $('#wmLogoClear').addEventListener('click', () => {
      logoImg = null;
      try { localStorage.removeItem(LOGO_KEY); } catch (_) { /* nada */ }
      changed();
    });

    $('#resetBtn').addEventListener('click', () => {
      settings = Object.assign({}, DEFAULTS);
      if (!supported[settings.format]) settings.format = 'jpeg';
      changed();
      toast(t('Ajustes restablecidos'));
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
    markSegmented('wmType', s.wmType);
    markSegmented('wmPos', s.wmPos);
    $('#pdfOptions').hidden = s.format !== 'pdf';
    $('#autoOptions').hidden = s.format !== 'auto';
    $('#pdfMerge').checked = s.pdfMerge;
    $('#mozjpeg').checked = s.mozjpeg;
    $('#wmOn').checked = s.wmOn;
    for (const key of ['autoPhoto', 'autoAlpha', 'autoGraphic']) {
      // Las opciones que el navegador no puede generar salen desactivadas
      $$(`#${key} option`).forEach((o) => { o.disabled = !supported[o.value]; });
      $('#' + key).value = supported[s[key]] ? s[key] : usableFormat(s[key]).id;
    }
    $$('.mode-body').forEach((el) => { el.hidden = el.dataset.mode !== s.resizeMode; });
    $('[data-mode-hint="none"]').hidden = s.resizeMode !== 'none';

    const f = FMT[s.format];
    const flexible = f.id === 'auto' || f.id === 'original'; // pueden salir varios formatos
    const lossy = f.lossy || flexible;
    $('#formatHint').textContent = formatDesc(f);
    const missing = FORMATS.filter((x) => !supported[x.id]).map((x) => x.label);
    $('#formatNote').hidden = !missing.length;
    $('#formatNote').textContent = missing.length ? t('Este navegador no puede generar: {f}. Prueba con Chrome, Edge o Firefox actualizados.', { f: missing.join(', ') }) : '';
    $('#qualityBlock').hidden = !lossy;
    $('#pngOptions').hidden = !(f.id === 'png' || flexible);
    $('#pngColorsRow').hidden = s.pngMode !== 'palette';
    $('#mozBlock').hidden = !wasmOK || !(f.id === 'jpeg' || f.id === 'pdf' || flexible);
    $('#losslessHint').hidden = lossy || f.id === 'png';
    $('#metaHint').textContent = s.meta === 'strip'
      ? t('Se eliminan la cámara, la fecha, la ubicación y el resto de datos.')
      : t('Se conservan al guardar en JPG, PNG o WebP a partir de fotos JPG.') + (s.meta === 'keep-nogps' ? ' ' + t('La ubicación GPS se borra.') : '');

    $('#wmBody').hidden = !s.wmOn;
    $('#wmTextRow').hidden = s.wmType !== 'text';
    $('#wmLogoRow').hidden = s.wmType !== 'logo';
    $('#wmLogoPreview').hidden = !logoImg;
    $('#wmLogoClear').hidden = !logoImg;
    if (logoImg) $('#wmLogoPreview').src = logoImg.src;
    $('#wmLogoBtn').textContent = t(logoImg ? 'Cambiar logo…' : 'Elegir logo…');

    if (!fromInput) {
      $('#quality').value = s.quality;
      $('#percent').value = s.percent;
      $('#maxW').value = s.maxW || '';
      $('#maxH').value = s.maxH || '';
      $('#exactW').value = s.exactW || '';
      $('#exactH').value = s.exactH || '';
      $('#multiW').value = s.multiW;
      $('#targetKB').value = s.targetKB || '';
      $('#pngColors').value = s.pngColors;
      $('#bg').value = s.bg;
      $('#pattern').value = s.pattern;
      $('#wmText').value = s.wmText;
      $('#wmColor').value = s.wmColor;
      $('#wmSize').value = s.wmSize;
      $('#wmOpacity').value = s.wmOpacity;
    }
    $('#targetOn').checked = s.targetOn;
    $('#cover').checked = s.cover;
    $('#qualityOut').textContent = s.quality + '%';
    $('#percentOut').textContent = s.percent + '%';
    $('#pngColorsOut').textContent = s.pngColors;
    $('#wmSizeOut').textContent = s.wmSize + '%';
    $('#wmOpacityOut').textContent = s.wmOpacity + '%';
    const fill = (id, v, min, max) => $('#' + id).style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%');
    fill('quality', s.quality, 0, 100);
    fill('percent', s.percent, 5, 200);
    fill('pngColors', s.pngColors, 2, 256);
    fill('wmSize', s.wmSize, 2, 30);
    fill('wmOpacity', s.wmOpacity, 10, 100);
    drawWmPreview();
  }

  let cardTimer;
  function changed(fromInput) {
    version++;
    saveSettings();
    syncPanel(fromInput);
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => {
      updateAllCards();
      refreshChrome();
    }, fromInput ? 120 : 0);
  }

  /* ---------- Ajustes propios de una imagen ---------- */

  let itemEditing = null;

  function openItemDialog(it) {
    if (!usable(it)) return;
    itemEditing = it;
    const o = it.ov || {};
    $('#itemName').textContent = it.file.name;
    $('#ovFormat').innerHTML = `<option value="">${esc(t('Igual que el resto'))}</option>` +
      FORMATS.filter((f) => supported[f.id]).map((f) => `<option value="${f.id}">${esc(t(f.label))}</option>`).join('');
    $('#ovFormat').value = o.format || '';
    $('#ovQualityOn').checked = o.quality != null;
    $('#ovQuality').value = o.quality != null ? o.quality : settings.quality;
    $('#ovMaxW').value = o.maxW || '';
    syncItemDialog();
    $('#itemDialog').showModal();
  }

  function syncItemDialog() {
    const on = $('#ovQualityOn').checked;
    $('#ovQuality').disabled = !on;
    $('#ovQualityOut').textContent = $('#ovQuality').value + '%';
    $('#ovQuality').style.setProperty('--fill', $('#ovQuality').value + '%');
  }

  function bindItemDialog() {
    $('#ovQualityOn').addEventListener('change', syncItemDialog);
    $('#ovQuality').addEventListener('input', syncItemDialog);
    $('#ovApply').addEventListener('click', () => {
      const it = itemEditing;
      const ov = {};
      if ($('#ovFormat').value) ov.format = $('#ovFormat').value;
      if ($('#ovQualityOn').checked) ov.quality = Number($('#ovQuality').value);
      const mw = Number($('#ovMaxW').value);
      if (mw > 0) ov.maxW = Math.round(mw);
      it.ov = Object.keys(ov).length ? ov : null;
      markStale(it);
      $('#itemDialog').close();
      updateCard(it);
      refreshChrome();
    });
    $('#ovClear').addEventListener('click', () => {
      itemEditing.ov = null;
      markStale(itemEditing);
      $('#itemDialog').close();
      updateCard(itemEditing);
      refreshChrome();
    });
    $('#moveRow').addEventListener('click', (e) => {
      const b = e.target.closest('[data-move]');
      if (b && itemEditing) moveItem(itemEditing, b.dataset.move);
    });
  }

  /* ---------- Editor: recortar, girar y voltear ---------- */

  // El editor trabaja sobre una copia de la orientación (m) hasta pulsar Aplicar
  const crop = { it: null, ratio: 'free', rect: null, W: 0, H: 0, m: IDENTITY, ow: 0, oh: 0 };
  const MIN = 24;

  function renderCropRatios() {
    const opts = [{ id: 'free', label: 'Libre' }, { id: 'original', label: 'Original' }].concat(RATIOS.slice(1));
    $('#cropRatios').innerHTML = opts.map((r) => `<button type="button" class="chip" data-v="${r.id}">${esc(t(r.label))}</button>`).join('');
    markCropRatio();
  }

  function buildCropDialog() {
    renderCropRatios();
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
    const s = eff(it);
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
    $('#cmpLabelBefore').textContent = `${t('Original')} · ${fmtBytes(it.file.size)}`;
    $('#cmpLabelAfter').textContent = `${r.fmt} · ${fmtBytes(r.blob.size)} (${diff >= 0 ? '−' : '+'}${Math.abs(diff)}%)`;
    $('#cmpDialog').showModal();
    setCompareZoom(false);
    applyCompareX(0.5);
  }

  /* ---------- Informe de problemas ---------- */

  const AUTO_REPORT_KEY = 'pixelote.autoReport';
  const SENT_LOG_KEY = 'pixelote.reportsSent';
  const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const EMAIL_RE = /^[^\s@<>()[\],;:"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/i;
  // Límites de envío por navegador (sobreviven a recargar la página)
  const LIMITS = { perHour: 5, perDay: 15, autoPerSession: 3, sameErrorHours: 24, minGapMs: 20000 };
  const MAX_REPORT_CHARS = 8000;

  function reportProvider() {
    if (UUID_RE.test(String(CONFIG.web3formsKey || ''))) return 'web3forms';
    if (/^https:\/\/|^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(String(CONFIG.reportEndpoint || ''))) return 'endpoint';
    return null;
  }

  /* ---------- Navegador y sistema, en palabras ---------- */

  // Datos extra que dan Chrome y Edge (Client Hints): versión exacta y Windows 10 / 11
  let uaHints = null;
  function loadUaHints() {
    const uad = navigator.userAgentData;
    if (!uad || !uad.getHighEntropyValues) return;
    uad.getHighEntropyValues(['platformVersion', 'fullVersionList', 'model'])
      .then((h) => { uaHints = h; })
      .catch(() => { /* no disponible */ });
  }

  /* El "user agent" menciona varios navegadores por compatibilidad histórica
   * (Mozilla, Safari, Chrome…). Aquí se saca el que es de verdad. */
  function describeBrowser() {
    const ua = navigator.userAgent;
    const m = (re) => { const r = ua.match(re); return r ? r[1] : null; };
    let name = 'Desconocido', version = '', engine = '';

    const brands = (uaHints && uaHints.fullVersionList) || (navigator.userAgentData && navigator.userAgentData.brands) || [];
    const brand = (n) => brands.find((b) => b.brand === n);
    const known = ['Microsoft Edge', 'Opera', 'Brave', 'Vivaldi', 'Samsung Internet', 'Google Chrome', 'Chromium'];
    const fromHints = known.map(brand).find(Boolean);

    if (fromHints) {
      name = fromHints.brand.replace('Google ', '').replace('Microsoft ', '');
      version = String(fromHints.version).split('.')[0];
      engine = 'Chromium';
    } else if (m(/Edg(?:e|A|iOS)?\/(\d+)/)) { name = 'Edge'; version = m(/Edg(?:e|A|iOS)?\/(\d+)/); engine = 'Chromium'; }
    else if (m(/OPR\/(\d+)/)) { name = 'Opera'; version = m(/OPR\/(\d+)/); engine = 'Chromium'; }
    else if (m(/SamsungBrowser\/(\d+)/)) { name = 'Samsung Internet'; version = m(/SamsungBrowser\/(\d+)/); engine = 'Chromium'; }
    else if (m(/(?:Firefox|FxiOS)\/(\d+)/)) { name = 'Firefox'; version = m(/(?:Firefox|FxiOS)\/(\d+)/); engine = /FxiOS/.test(ua) ? 'WebKit' : 'Gecko'; }
    else if (m(/CriOS\/(\d+)/)) { name = 'Chrome'; version = m(/CriOS\/(\d+)/); engine = 'WebKit'; }
    else if (m(/Chrome\/(\d+)/)) { name = /HeadlessChrome/.test(ua) ? 'Chrome (sin interfaz)' : 'Chrome'; version = m(/Chrome\/(\d+)/); engine = 'Chromium'; }
    else if (/Safari\//.test(ua) && m(/Version\/([\d.]+)/)) { name = 'Safari'; version = m(/Version\/([\d.]+)/); engine = 'WebKit'; }
    if (navigator.brave && name === 'Chrome') name = 'Brave';

    // Sistema operativo
    let os = 'Desconocido';
    const platform = navigator.userAgentData && navigator.userAgentData.platform;
    if (/Windows/.test(ua) || platform === 'Windows') {
      const pv = uaHints && parseInt(String(uaHints.platformVersion).split('.')[0], 10);
      os = pv >= 13 ? 'Windows 11' : pv > 0 ? 'Windows 10' : 'Windows 10/11';
    } else if (/iPhone|iPad|iPod/.test(ua)) {
      os = `${/iPad/.test(ua) ? 'iPadOS' : 'iOS'} ${(m(/OS (\d+[_\d]*) like Mac/) || '').replace(/_/g, '.')}`.trim();
    } else if (/Mac OS X/.test(ua)) {
      // Safari en iPad se presenta como Mac; se distingue por la pantalla táctil
      os = navigator.maxTouchPoints > 1 ? 'iPadOS' : 'macOS';
    } else if (/Android/.test(ua)) {
      os = `Android ${m(/Android ([\d.]+)/) || ''}`.trim();
    } else if (/CrOS/.test(ua)) {
      os = 'ChromeOS';
    } else if (/Linux/.test(ua)) {
      os = 'Linux';
    }

    const mobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|iPhone|Android.*Mobile/.test(ua);
    const tablet = !mobile && (/iPad|Tablet|Android/.test(ua) || os === 'iPadOS');
    const device = mobile ? 'móvil' : tablet ? 'tableta' : 'ordenador';
    const model = uaHints && uaHints.model ? ` (${uaHints.model})` : '';

    return `${name}${version ? ' ' + version : ''}${engine ? ` (motor ${engine})` : ''} · ${os} · ${device}${model}`;
  }

  function currentTheme() {
    return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  /* Quita del texto todo lo que pueda identificar a la persona: nombres de sus
   * archivos y carpetas, rutas de su equipo (llevan su usuario), emails y
   * enlaces internos del navegador. */
  function scrub(text) {
    let out = String(text);
    const names = new Set();
    items.forEach((i) => {
      names.add(i.file.name);
      const b = baseName(i.file.name);
      if (b.length > 3) names.add(b);
      if (i.relDir) i.relDir.split('/').forEach((d) => { if (d.length > 2) names.add(d); });
    });
    Array.from(names).sort((a, b) => b.length - a.length).forEach((n) => { out = out.split(n).join('[archivo]'); });
    return out
      .replace(/file:\/\/\/[^\s)'"]+/gi, '[ruta local]')
      .replace(/[a-z]:\\(?:[^\\\s]+\\)*[^\\\s]*/gi, '[ruta local]')
      .replace(/\/(?:Users|home)\/[^\s/)'"]+/g, '/[usuario]')
      .replace(/blob:[^\s)'"]+/gi, '[blob]')
      .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, '[email]')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  }

  /* El informe va en español (lo lee quien mantiene la app). Nunca incluye las
   * imágenes ni sus nombres, ni el texto de la marca de agua. */
  function buildReport(what, steps, diag) {
    const lines = ['Pixelote — informe de problema', `Fecha: ${new Date().toISOString()}`, '', '## Qué ha pasado', what || '—'];
    if (steps) lines.push('', '## Pasos para repetirlo', steps);
    if (diag) {
      const types = {};
      items.forEach((i) => {
        const k = i.file.type || '.' + (i.file.name.split('.').pop() || '?').toLowerCase();
        types[k] = (types[k] || 0) + 1;
      });
      const count = (st) => items.filter((i) => i.status === st).length;
      const s = Object.assign({}, settings);
      delete s.wmText;
      lines.push('', '## Datos técnicos',
        `Versión: ${APP_VERSION}`,
        `Navegador: ${describeBrowser()}`,
        `Agente de usuario (técnico): ${navigator.userAgent}`,
        `Idioma: ${I18N.lang} · Tema: ${currentTheme()} · Diseño: ${document.documentElement.dataset.design || '—'}`,
        `Pantalla: ${screen.width}×${screen.height} @${window.devicePixelRatio}x · Ventana: ${innerWidth}×${innerHeight}`,
        `Abierta desde: ${location.protocol.replace(':', '')} · Instalada: ${matchMedia('(display-mode: standalone)').matches ? 'sí' : 'no'}`,
        `Formatos que genera: ${FORMATS.filter((f) => f.mime && supported[f.id]).map((f) => f.label).join(', ')} · AVIF nativo: ${nativeAvif ? 'sí' : 'no'}`,
        `Workers en segundo plano: ${pool.slots.length}`,
        `Imágenes: ${items.length} (${Object.entries(types).map(([k, v]) => `${k} ×${v}`).join(', ') || '—'})`,
        `Estados: listas ${count('ready')}, con error ${count('error')}, ilegibles ${count('invalid')}`,
        `Ajustes: ${JSON.stringify(s)}`,
        '', '## Errores recientes', ...(errorLog.length ? errorLog.map((e) => '- ' + e) : ['—']));
    }
    return scrub(lines.join('\n')).slice(0, MAX_REPORT_CHARS);
  }

  function dialogReport() {
    return buildReport($('#bugText').value.trim(), $('#bugSteps').value.trim(), $('#bugDiag').checked);
  }

  /* Primero se limpia y después se corta: un email cortado ya no se reconocería. */
  function reportTitle(what) {
    return scrub(what.split('\n')[0] || 'Problema').slice(0, 80);
  }

  /* Enlace de GitHub o de correo, si se configuró alguno (y no hay envío directo). */
  function bugSendUrl(report) {
    const title = '[Bug] ' + scrub(reportTitle($('#bugText').value.trim()));
    if (/^[\w.-]+\/[\w.-]+$/.test(CONFIG.reportGithub || '')) {
      return `https://github.com/${CONFIG.reportGithub}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(report.slice(0, 6000))}`;
    }
    if (EMAIL_RE.test(CONFIG.reportEmail || '')) {
      // Los clientes de correo cortan los enlaces mailto largos
      return `mailto:${CONFIG.reportEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(report.slice(0, 1800))}`;
    }
    return null;
  }

  /* Registro de envíos para limitar la frecuencia (horas y huellas de errores). */
  function sentLog() {
    const log = loadJSON(SENT_LOG_KEY, null);
    const now = Date.now();
    const keep = (arr, ms) => (Array.isArray(arr) ? arr.filter((x) => now - (x.t || x) < ms) : []);
    return {
      times: keep(log && log.times, 864e5),
      sigs: keep(log && log.sigs, LIMITS.sameErrorHours * 36e5),
    };
  }

  function hashText(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  let lastSendAt = 0;
  let autoSentThisSession = 0;

  /* Comprueba los límites. Devuelve el motivo si no se puede enviar, o null. */
  function rateLimited(auto, sig) {
    const log = sentLog();
    const now = Date.now();
    if (!auto && now - lastSendAt < LIMITS.minGapMs) return 'gap';
    if (log.times.filter((t) => now - t < 36e5).length >= LIMITS.perHour) return 'hour';
    if (log.times.length >= LIMITS.perDay) return 'day';
    if (auto && autoSentThisSession >= LIMITS.autoPerSession) return 'session';
    if (sig && log.sigs.some((x) => x.h === sig)) return 'duplicate';
    return null;
  }

  function recordSend(sig) {
    const log = sentLog();
    log.times.push(Date.now());
    if (sig) log.sigs.push({ h: sig, t: Date.now() });
    saveJSON(SENT_LOG_KEY, log);
    lastSendAt = Date.now();
  }

  /* Envía el informe por el proveedor configurado. Lanza un error con `code`
   * ('limit', 'offline', 'config' o 'send') si no se puede. */
  async function sendReport({ subject, report, email, auto, sig }) {
    const provider = reportProvider();
    const fail = (code, detail) => Object.assign(new Error(detail || code), { code });
    if (!provider) throw fail('config');
    if (!navigator.onLine) throw fail('offline');
    const limited = rateLimited(auto, sig);
    if (limited) throw fail('limit', limited);

    const cleanSubject = scrub(subject).replace(/[\r\n]+/g, ' ').slice(0, 100);
    const replyto = EMAIL_RE.test(email || '') ? email : '';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      let res;
      if (provider === 'web3forms') {
        res = await fetch(WEB3FORMS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: CONFIG.web3formsKey,
            subject: `[Pixelote${auto ? ' · auto' : ''}] ${cleanSubject}`,
            from_name: 'Pixelote',
            message: report,
            version: APP_VERSION,
            tipo: auto ? 'automático' : 'enviado por la persona',
            ...(replyto ? { replyto } : {}),
            botcheck: false,
          }),
          credentials: 'omit',
          referrerPolicy: 'strict-origin',
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw fail('send', data.message || 'HTTP ' + res.status);
      } else {
        res = await fetch(CONFIG.reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: cleanSubject, report, email: replyto, auto: !!auto, version: APP_VERSION, hp: '' }),
          credentials: 'omit',
          signal: ctrl.signal,
        });
        if (!res.ok) throw fail('send', 'HTTP ' + res.status);
      }
    } catch (e) {
      if (e.code) throw e;
      throw fail('send', e.name === 'AbortError' ? 'tiempo agotado' : e.message);
    } finally {
      clearTimeout(timer);
    }
    recordSend(sig);
    if (auto) autoSentThisSession++;
  }

  function sendErrorMessage(e) {
    if (e.code === 'limit') {
      return e.message === 'gap' ? t('Espera unos segundos antes de enviar otro informe.')
        : e.message === 'duplicate' ? t('Este error ya se envió hace poco. ¡Gracias!')
        : t('Has enviado varios informes en poco tiempo. Inténtalo más tarde.');
    }
    if (e.code === 'offline') return t('No hay conexión a internet. Puedes copiar o descargar el informe.');
    return t('No se pudo enviar el informe. Puedes copiarlo o descargarlo.');
  }

  function refreshBugReport() {
    const report = dialogReport();
    $('#bugReport').textContent = report;
    const direct = !!reportProvider();
    const url = direct ? null : bugSendUrl(report);
    $('#bugSendApi').hidden = !direct;
    $('#bugEmailRow').hidden = !direct;
    $('#bugSend').hidden = !url;
    $('#bugHint').hidden = direct || !!url;
    if (url) $('#bugSend').href = url;
    return report;
  }

  function openBugDialog(prefill) {
    if (prefill) {
      $('#bugText').value = prefill;
      $('#bugSteps').value = '';
    }
    refreshBugReport();
    if (!$('#bugDialog').open) $('#bugDialog').showModal();
    $('#bugText').focus();
  }

  /* ---------- Avisos automáticos de error ---------- */

  // Error pendiente de enviar (en español, para el informe) y control de avisos repetidos
  let pendingError = null;
  const seenErrors = new Set();

  function autoReportOn() {
    try { return !!reportProvider() && localStorage.getItem(AUTO_REPORT_KEY) === '1'; } catch (_) { return false; }
  }
  function setAutoReport(on) {
    try { if (on) localStorage.setItem(AUTO_REPORT_KEY, '1'); else localStorage.removeItem(AUTO_REPORT_KEY); } catch (_) { /* nada */ }
    $('#autoReport').checked = on;
  }

  function sendPendingError(auto) {
    const err = pendingError;
    const report = buildReport('Error detectado automáticamente: ' + err.reportText, '', true);
    return sendReport({ subject: reportTitle(err.reportText), report, email: '', auto, sig: err.sig });
  }

  /* Se llama cuando algo falla de verdad. `uiText` va traducido para el aviso;
   * `reportText` va en español para el informe. */
  function onAppError(uiText, reportText) {
    // La huella ignora números y horas, para no repetir el mismo error con otros datos
    const sig = hashText(scrub(reportText).replace(/\d+/g, '#').slice(0, 200));
    if (seenErrors.has(sig)) return;
    seenErrors.add(sig);
    pendingError = { uiText, reportText, sig };

    if (autoReportOn()) {
      sendPendingError(true)
        .then(() => toast(t('Se envió un informe del error automáticamente. ¡Gracias!')))
        .catch((e) => console.warn('No se envió el informe automático:', e.code, e.message));
      return;
    }
    const direct = !!reportProvider();
    $('#epText').textContent = uiText;
    $('#epAlwaysRow').hidden = !direct;
    $('#epAlways').checked = false;
    $('#epSend').disabled = false;
    $('#epSend').textContent = t(direct ? 'Enviar informe' : 'Preparar informe');
    $('#errorPrompt').hidden = false;
  }

  function closeErrorPrompt() {
    $('#errorPrompt').hidden = true;
  }

  /* Errores no controlados: solo los de la propia app (no los de extensiones del navegador). */
  function ownScript(filename) {
    if (!filename) return true;
    return filename.startsWith('blob:') || filename.startsWith(location.origin === 'null' ? 'file:' : location.origin);
  }

  function bindErrorPrompt() {
    window.addEventListener('error', (e) => {
      if (!ownScript(e.filename)) return;
      onAppError(t('Se produjo un error inesperado.'), `Error no controlado: ${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno || '?'})`);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
      onAppError(t('Se produjo un error inesperado.'), `Promesa rechazada sin controlar: ${msg}`);
    });

    $('#epClose').addEventListener('click', closeErrorPrompt);
    $('#epDetails').addEventListener('click', () => {
      closeErrorPrompt();
      openBugDialog(pendingError ? 'Error detectado automáticamente: ' + pendingError.reportText + '\n\n' : '');
    });
    $('#epSend').addEventListener('click', async () => {
      if (!pendingError) return;
      if (!reportProvider()) { $('#epDetails').click(); return; }
      if ($('#epAlways').checked) setAutoReport(true);
      const btn = $('#epSend');
      btn.disabled = true;
      btn.textContent = t('Enviando…');
      try {
        await sendPendingError(false);
        closeErrorPrompt();
        toast(t('Informe enviado. ¡Gracias!'));
      } catch (e) {
        console.warn('No se envió el informe:', e.code, e.message);
        closeErrorPrompt();
        if (e.code === 'limit' && e.message === 'duplicate') { toast(sendErrorMessage(e)); return; }
        openBugDialog('Error detectado automáticamente: ' + pendingError.reportText + '\n\n');
        toast(sendErrorMessage(e));
      }
    });

    $('#autoReportRow').hidden = !reportProvider();
    $('#autoReport').checked = autoReportOn();
    $('#autoReport').addEventListener('change', (e) => setAutoReport(e.target.checked));
  }

  function bindBugReport() {
    $('#bugBtn').addEventListener('click', () => openBugDialog());
    for (const id of ['bugText', 'bugSteps', 'bugDiag']) $('#' + id).addEventListener('input', refreshBugReport);
    const needText = () => {
      if ($('#bugText').value.trim()) return false;
      toast(t('Escribe primero qué ha pasado'));
      $('#bugText').focus();
      return true;
    };
    $('#bugCopy').addEventListener('click', async () => {
      if (needText()) return;
      const report = refreshBugReport();
      try { await navigator.clipboard.writeText(report); } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = report; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      toast(t('Informe copiado'));
    });
    $('#bugDownload').addEventListener('click', () => {
      if (needText()) return;
      const day = new Date().toISOString().slice(0, 10);
      download(new Blob([refreshBugReport()], { type: 'text/plain;charset=utf-8' }), `informe-pixelote-${day}.txt`);
    });
    $('#bugSend').addEventListener('click', (e) => {
      if (needText()) { e.preventDefault(); return; }
      refreshBugReport();
    });
    $('#bugSendApi').addEventListener('click', async () => {
      if (needText()) return;
      const email = $('#bugEmail').value.trim();
      if (email && !EMAIL_RE.test(email)) { toast(t('Ese email no parece válido')); $('#bugEmail').focus(); return; }
      const btn = $('#bugSendApi');
      btn.disabled = true;
      btn.textContent = t('Enviando…');
      try {
        // Casilla trampa: solo un bot la marcaría. Se finge el envío y no se manda nada.
        if (!$('#bugBotcheck').checked) {
          await sendReport({ subject: reportTitle($('#bugText').value.trim()), report: refreshBugReport(), email, auto: false });
        }
        $('#bugDialog').close();
        $('#bugText').value = '';
        $('#bugSteps').value = '';
        toast(t('Informe enviado. ¡Gracias!'));
      } catch (e) {
        console.warn('No se envió el informe:', e.code, e.message);
        toast(sendErrorMessage(e));
      } finally {
        btn.disabled = false;
        btn.textContent = t('Enviar');
      }
    });
  }

  /* ---------- Tema, idioma, app instalable ---------- */

  function bindTheme() {
    const btn = $('#themeBtn');
    const media = matchMedia('(prefers-color-scheme: dark)');
    const current = () => document.documentElement.dataset.theme || (media.matches ? 'dark' : 'light');
    const paint = () => {
      const dark = current() === 'dark';
      btn.textContent = dark ? '☀️' : '🌙';
      btn.title = t(dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('aria-label', btn.title);
    };
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      saveJSON(THEME_KEY, next);
      paint();
    });
    media.addEventListener('change', paint);
    paint();
    return paint;
  }

  /* Banderas en SVG (los emojis de bandera no se ven en Windows). `uid` evita
   * ids repetidos cuando la misma bandera aparece varias veces. */
  const LANG_NAMES = { es: 'Español', en: 'English', pt: 'Português (Brasil)', de: 'Deutsch' };
  function flagSvg(lang, uid) {
    const a = 'preserveAspectRatio="xMidYMid slice"';
    switch (lang) {
      case 'es':
        return `<svg viewBox="0 0 750 500" ${a}><rect width="750" height="500" fill="#c60b1e"/><rect y="125" width="750" height="250" fill="#ffc400"/></svg>`;
      case 'de':
        return `<svg viewBox="0 0 5 3" ${a}><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#d00"/><rect y="2" width="5" height="1" fill="#ffce00"/></svg>`;
      case 'pt':
        return `<svg viewBox="0 0 720 504" ${a}><rect width="720" height="504" fill="#009c3b"/><path d="M360 43 677 252 360 461 43 252z" fill="#ffdf00"/>` +
          `<circle cx="360" cy="252" r="124" fill="#002776"/><path d="M240 232Q360 206 480 262" stroke="#fff" stroke-width="16" fill="none"/></svg>`;
      default: // en: Reino Unido
        return `<svg viewBox="0 0 60 30" ${a}><clipPath id="${uid}s"><path d="M0 0v30h60V0z"/></clipPath>` +
          `<clipPath id="${uid}t"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#${uid}s)">` +
          '<path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/>' +
          `<path d="M0 0l60 30m0-30L0 30" clip-path="url(#${uid}t)" stroke="#c8102e" stroke-width="4"/>` +
          '<path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></g></svg>';
    }
  }

  function bindLanguage(paintTheme) {
    const btn = $('#langBtn');
    const menu = $('#langMenu');
    menu.innerHTML = I18N.LANGS.map((l) =>
      `<li role="option" tabindex="-1" data-lang="${l}" lang="${l}"><span class="flag" aria-hidden="true">${flagSvg(l, 'flag-m-' + l)}</span><span>${LANG_NAMES[l]}</span></li>`).join('');
    const options = () => $$('#langMenu [role="option"]');
    const paintButton = () => {
      $('#langFlag').innerHTML = flagSvg(I18N.lang, 'flag-b-' + I18N.lang);
      $('#langCode').textContent = I18N.lang.toUpperCase();
      btn.title = LANG_NAMES[I18N.lang];
      options().forEach((li) => li.setAttribute('aria-selected', li.dataset.lang === I18N.lang));
    };
    const open = () => {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      (options().find((li) => li.dataset.lang === I18N.lang) || options()[0]).focus();
    };
    const close = (focusButton) => {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (focusButton) btn.focus();
    };
    const choose = (l) => { close(true); I18N.setLang(l); };

    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    menu.addEventListener('click', (e) => {
      const li = e.target.closest('[data-lang]');
      if (li) choose(li.dataset.lang);
    });
    menu.addEventListener('keydown', (e) => {
      const list = options();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) choose(list[i].dataset.lang); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close(false);
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !e.target.closest('#langPicker')) close(false);
    });
    paintButton();

    I18N.onChange(() => {
      paintButton();
      document.title = t('Pixelote · Conversor de imágenes');
      document.body.dataset.drop = t('Suelta para añadir');
      renderPanelLists();
      renderCropRatios();
      syncPanel();
      paintTheme();
      updateAllCards();
      refreshChrome();
    });
  }

  function setupPWA() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    // El manifiesto solo se enlaza al servir la app por http(s): desde file:// el navegador lo bloquea
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.webmanifest';
    document.head.appendChild(link);
    navigator.serviceWorker.register('sw.js').then(() => { $('#offlineRow').hidden = false; }).catch((e) => console.warn('Sin modo sin conexión:', e));

    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      $('#installBtn').hidden = false;
    });
    $('#installBtn').addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      $('#installBtn').hidden = true;
    });
    window.addEventListener('appinstalled', () => {
      $('#installBtn').hidden = true;
      toast(t('¡Pixelote instalado!'));
    });

    // Descarga los códecs para que el service worker los guarde
    $('#offlineBtn').addEventListener('click', async () => {
      const urls = Codecs.CDN_FILES.concat(Encoders.WASM_FILES);
      const btn = $('#offlineBtn');
      btn.disabled = true;
      let ok = 0;
      for (const u of urls) {
        btn.textContent = t('Descargando… {i}/{n}', { i: ok + 1, n: urls.length });
        try { const r = await fetch(u); if (r.ok) ok++; } catch (_) { /* sin conexión */ }
      }
      btn.disabled = false;
      btn.textContent = t('Descargar códecs (TIFF, AVIF, MozJPEG)');
      toast(ok === urls.length ? t('Listo: ya puedes usar TIFF, AVIF y MozJPEG sin conexión') : t('No se pudieron descargar todos los códecs. ¿Hay conexión?'));
    });
  }

  /* ---------- Entrada de archivos ---------- */

  function bindInput() {
    const dz = $('#dropzone');
    const input = $('#fileInput');
    const folder = $('#folderInput');
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    folder.addEventListener('change', () => { addFiles(folder.files); folder.value = ''; });
    $('#addMoreBtn').addEventListener('click', () => input.click());
    $('#folderBtn').addEventListener('click', () => folder.click());
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
    window.addEventListener('dragleave', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
      depth = Math.max(0, depth - 1);
      if (!depth) document.body.classList.remove('dragging');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(await filesFromDrop(e.dataTransfer));
    });
    window.addEventListener('paste', (e) => {
      const files = Array.from(e.clipboardData ? e.clipboardData.files : []);
      if (files.length) {
        addFiles(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `pegada-${Date.now()}-${i + 1}.png`, { type: f.type }))));
      }
    });

    $('#processBtn').addEventListener('click', processAll);
    $('#zipBtn').addEventListener('click', downloadAll);
    if (window.showDirectoryPicker) {
      $('#saveFolderBtn').hidden = false;
      $('#saveFolderBtn').addEventListener('click', saveToFolder);
    }
  }

  /* ---------- Inicio ---------- */

  (async function init() {
    I18N.init();
    document.title = t('Pixelote · Conversor de imágenes');
    document.body.dataset.drop = t('Suelta para añadir');
    $('#appVersion').textContent = APP_VERSION;
    $('#year').textContent = new Date().getFullYear();
    await detectSupport();
    loadUaHints();
    if (!supported[settings.format]) settings.format = supported.webp ? 'webp' : 'jpeg';
    let savedLogo = null;
    try { savedLogo = localStorage.getItem(LOGO_KEY); } catch (_) { /* sin almacenamiento */ }
    logoImg = await loadLogo(savedLogo);
    buildPanel();
    bindPresetActions();
    buildCropDialog();
    buildCompareDialog();
    bindItemDialog();
    bindBugReport();
    bindErrorPrompt();
    bindReorder();
    bindInput();
    bindLanguage(bindTheme());
    syncPanel();
    refreshChrome();
    checkSharedPreset();
    setupPWA();
    initPool(); // arranca los Workers mientras se eligen las imágenes
  })();
})();
