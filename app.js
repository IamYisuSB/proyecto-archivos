(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Catálogo ---------- */

  const FORMATS = [
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
  const KIND_TO_FMT = { heic: 'jpeg', raw: 'jpeg', psd: 'png', tiff: 'tiff' };

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
    { label: 'Sin pérdida', emoji: '💎', set: { format: 'png', resizeMode: 'none', cropRatio: 'none', targetOn: false } },
    { label: 'Favicon', emoji: '⭐', set: { format: 'ico', resizeMode: 'none', cropRatio: '1:1', targetOn: false } },
  ];

  const DEFAULTS = {
    format: 'webp', quality: 82, targetOn: false, targetKB: 200,
    resizeMode: 'none', percent: 50, maxW: 1920, maxH: 1920, exactW: 1080, exactH: 1080, cover: true,
    cropRatio: 'none', bg: '#ffffff', pattern: '{nombre}',
    pdfMerge: true, pdfPage: 'fit',
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
  function ratioValue(id, it) {
    if (id === 'original' && it) return it.w / it.h;
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

  /* Formato real de salida para una imagen (resuelve "Original"). */
  function outFormat(it) {
    if (settings.format !== 'original') return FMT[settings.format];
    const id = MIME_TO_FMT[it.file.type] || KIND_TO_FMT[it.kind];
    if (id && supported[id]) return FMT[id];
    return FMT.png; // SVG y otros → PNG para no perder transparencia
  }

  /* ---------- Geometría ---------- */

  function centerCrop(rect, r) {
    let { x, y, w, h } = rect;
    if (w / h > r) { const nw = h * r; x += (w - nw) / 2; w = nw; }
    else { const nh = w / r; y += (h - nh) / 2; h = nh; }
    return { x, y, w, h };
  }

  function geometry(it) {
    let src = { x: 0, y: 0, w: it.w, h: it.h };
    if (it.crop) {
      src = { x: it.crop.x * it.w, y: it.crop.y * it.h, w: it.crop.w * it.w, h: it.crop.h * it.h };
    } else if (settings.cropRatio !== 'none') {
      src = centerCrop(src, ratioValue(settings.cropRatio, it));
    }

    let dw = src.w, dh = src.h;
    const s = settings;
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

  /* Reduce por mitades para que las reducciones grandes no se vean pixeladas. */
  function render(it, g, fmt) {
    let cur = it.img, cx = g.sx, cy = g.sy, cw = g.sw, ch = g.sh;
    while (cw / 2 >= g.dw && ch / 2 >= g.dh) {
      const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
      const c = makeCanvas(nw, nh);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      cur = c; cx = 0; cy = 0; cw = nw; ch = nh;
    }
    const out = makeCanvas(g.dw, g.dh);
    const ctx = out.getContext('2d');
    if (!fmt.alpha) { ctx.fillStyle = settings.bg; ctx.fillRect(0, 0, g.dw, g.dh); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, g.dw, g.dh);
    return out;
  }

  async function encode(canvas, fmt, q) {
    const pixels = () => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    if (fmt.id === 'bmp') return Encoders.encodeBMP(pixels());
    if (fmt.id === 'tiff') return Encoders.encodeTIFF(pixels());
    if (fmt.id === 'gif') return Encoders.encodeGIF(pixels());
    if (fmt.id === 'ico') return Encoders.encodeICO(canvas);
    if (fmt.id === 'avif' && !nativeAvif) return Encoders.encodeAVIF(pixels(), q);
    if (fmt.id === 'pdf') {
      const page = { jpeg: await canvasToBlob(canvas, 'image/jpeg', q), w: canvas.width, h: canvas.height };
      const pdf = await Encoders.makePDF([page], settings.pdfPage);
      pdfPages.set(pdf, page);
      return pdf;
    }
    return canvasToBlob(canvas, fmt.mime, fmt.lossy ? q : undefined);
  }

  /* Si hay tamaño objetivo, busca la mayor calidad que lo cumpla. */
  async function encodeWithTarget(canvas, fmt) {
    const q = settings.quality / 100;
    let blob = await encode(canvas, fmt, q);
    if (!fmt.lossy || !settings.targetOn || !(settings.targetKB > 0)) return { blob, q };
    const target = settings.targetKB * 1024;
    if (blob.size <= target) return { blob, q };

    let lo = 0.03, hi = q, best = null;
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2;
      const b = await encode(canvas, fmt, mid);
      if (b.size <= target) { best = { blob: b, q: mid }; lo = mid; } else { hi = mid; }
    }
    if (best) return best;
    return { blob: await encode(canvas, fmt, 0.03), q: 0.03, missed: true };
  }

  function outputName(it, index, g, fmt) {
    const total = items.length;
    const n = String(index + 1).padStart(String(total).length, '0');
    const pattern = settings.pattern.trim() || '{nombre}';
    let name = pattern
      .replace(/\{nombre\}/gi, baseName(it.file.name))
      .replace(/\{n\}/gi, n)
      .replace(/\{ancho\}/gi, g.dw)
      .replace(/\{alto\}/gi, g.dh);
    name = name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'imagen';
    return name + '.' + fmt.ext;
  }

  async function processItem(it, index) {
    const fmt = outFormat(it);
    const g = geometry(it);
    const canvas = render(it, g, fmt);
    const { blob, q, missed } = await encodeWithTarget(canvas, fmt);
    return {
      blob, url: URL.createObjectURL(blob), name: outputName(it, index, g, fmt),
      w: fmt.id === 'ico' ? Math.min(256, Math.max(g.dw, g.dh)) : g.dw,
      h: fmt.id === 'ico' ? Math.min(256, Math.max(g.dw, g.dh)) : g.dh,
      fmt: fmt.label, q, missed, version,
    };
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
      const detail = /^(Solo|Compresión|Este RAW)/.test(e.message) ? `: ${e.message.charAt(0).toLowerCase()}${e.message.slice(1)}` : '';
      throw new Error(`No se pudo leer este ${label}${detail}`);
    }
    return loadImage(blob);
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || Codecs.kindOf(f) || /\.(bmp|ico|svg|avif|webp)$/i.test(f.name));
    if (!files.length) { toast('No he encontrado imágenes en lo que has soltado'); return; }

    for (const file of files) {
      const it = { id: nextId++, file, kind: Codecs.kindOf(file), status: 'loading', crop: null, result: null };
      items.push(it);
      it.el = createCard(it);
      $('#grid').appendChild(it.el);
    }
    refreshChrome();

    for (const it of items.filter((i) => i.status === 'loading')) {
      try {
        const { img, url } = await openFile(it);
        it.img = img; it.url = url;
        it.w = img.naturalWidth || 1024;
        it.h = img.naturalHeight || 1024;
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
      resultHtml = `
        <div class="result ${stale ? 'stale' : ''}">
          <div class="res-line"><b>${esc(r.fmt)}</b> · ${fmtBytes(r.blob.size)} ${badge}</div>
          ${r.missed ? '<div class="sub warn">No se alcanzó el tamaño objetivo</div>' : ''}
          ${stale ? '<div class="sub warn">Ajustes cambiados: vuelve a convertir</div>' : ''}
          <a class="btn small primary dl" href="${r.url}" download="${esc(r.name)}">Descargar</a>
        </div>`;
    }

    li.className = 'item' + (r && !stale ? ' done' : '');
    li.innerHTML = `
      <div class="thumb">
        <img src="${it.url}" alt="" loading="lazy">
        ${it.crop ? '<span class="tag">✂ recorte manual</span>' : ''}
        <div class="thumb-actions">
          <button class="icon-btn" data-act="crop" title="Recortar" aria-label="Recortar">✂</button>
          <button class="icon-btn" data-act="remove" title="Quitar" aria-label="Quitar">✕</button>
        </div>
      </div>
      <div class="meta">
        <div class="name" title="${name}">${name}</div>
        <div class="sub">${it.kind ? `<span class="src-tag">${Codecs.LABELS[it.kind]}</span> ` : ''}${it.w}×${it.h} · ${origSize}</div>
        <div class="sub arrow">→ ${g.dw}×${g.dh} · ${esc(fmt.label)}</div>
      </div>
      ${resultHtml}`;
  }

  /* ---------- Toolbar, resumen y botones ---------- */

  function refreshChrome() {
    const valid = items.filter((i) => i.status !== 'invalid' && i.status !== 'loading');
    const has = items.length > 0;
    $('#dropzone').classList.toggle('compact', has);
    $('#toolbar').hidden = !has;
    const total = items.reduce((a, i) => a + i.file.size, 0);
    $('#toolbarInfo').innerHTML = `<b>${items.length}</b> ${items.length === 1 ? 'imagen' : 'imágenes'} · ${fmtBytes(total)}`;

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

  async function processAll() {
    const todo = items.filter((i) => i.status !== 'invalid' && i.status !== 'loading');
    if (busy || !todo.length) return;
    busy = true;
    const btn = $('#processBtn');
    const bar = $('#progressBar');
    $('#progress').hidden = false;
    bar.style.width = '0%';
    refreshChrome();

    let done = 0, failed = 0;
    for (const it of todo) {
      btn.textContent = `Procesando ${done + 1} de ${todo.length}…`;
      it.status = 'working';
      updateCard(it);
      await nextFrame();
      try {
        const res = await processItem(it, items.indexOf(it));
        if (it.result) URL.revokeObjectURL(it.result.url);
        it.result = res;
        it.status = 'ready';
      } catch (e) {
        console.error(e);
        it.status = 'error';
        failed++;
      }
      updateCard(it);
      done++;
      bar.style.width = (done / todo.length * 100) + '%';
    }

    busy = false;
    setTimeout(() => { $('#progress').hidden = true; }, 600);
    refreshChrome();
    toast(failed ? `Listo, pero ${failed} no se pudieron convertir` : `¡Listo! ${done} ${done === 1 ? 'imagen convertida' : 'imágenes convertidas'}`);
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
        <small>${f.id === 'original' ? 'mismo formato' : f.lossy ? 'con pérdida' : 'sin pérdida'}</small>
      </button>`).join('');
    $('#formats').addEventListener('click', (e) => {
      const b = e.target.closest('.fmt');
      if (!b || b.disabled) return;
      settings.format = b.dataset.v;
      changed();
    });

    const ratioChips = RATIOS.map((r) => `<button type="button" role="radio" class="chip" data-v="${r.id}">${r.label}</button>`).join('');
    $('#ratios').innerHTML = ratioChips;
    $('#ratios').addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      settings.cropRatio = b.dataset.v;
      changed();
    });

    $('#pdfPage').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      settings.pdfPage = b.dataset.v;
      changed();
    });

    $('#resizeMode').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      settings.resizeMode = b.dataset.v;
      changed();
    });

    const numeric = ['quality', 'percent', 'maxW', 'maxH', 'exactW', 'exactH', 'targetKB'];
    for (const key of numeric) {
      $('#' + key).addEventListener('input', (e) => {
        settings[key] = e.target.value === '' ? 0 : Number(e.target.value);
        changed(true);
      });
    }
    for (const key of ['targetOn', 'cover', 'pdfMerge']) {
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

  /* Refleja los ajustes en el panel. `fromInput` evita reescribir el campo que se está tecleando. */
  function syncPanel(fromInput) {
    const s = settings;
    $$('#formats .fmt').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === s.format));
    $$('#ratios .chip').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === s.cropRatio));
    $$('#resizeMode button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === s.resizeMode));
    $$('#pdfPage button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === s.pdfPage));
    $('#pdfOptions').hidden = s.format !== 'pdf';
    $('#pdfMerge').checked = s.pdfMerge;
    $$('.mode-body').forEach((el) => { el.hidden = el.dataset.mode !== s.resizeMode; });
    $('[data-mode-hint="none"]').hidden = s.resizeMode !== 'none';

    const f = FMT[s.format];
    $('#formatHint').textContent = f.desc;
    const lossless = f.id !== 'original' && !f.lossy;
    $('#qualityBlock').hidden = lossless;
    $('#losslessHint').hidden = !lossless;

    if (!fromInput) {
      $('#quality').value = s.quality;
      $('#percent').value = s.percent;
      $('#maxW').value = s.maxW || '';
      $('#maxH').value = s.maxH || '';
      $('#exactW').value = s.exactW || '';
      $('#exactH').value = s.exactH || '';
      $('#targetKB').value = s.targetKB || '';
      $('#bg').value = s.bg;
      $('#pattern').value = s.pattern;
    }
    $('#targetOn').checked = s.targetOn;
    $('#cover').checked = s.cover;
    $('#qualityOut').textContent = s.quality + '%';
    $('#percentOut').textContent = s.percent + '%';
    $('#quality').style.setProperty('--fill', s.quality + '%');
    $('#percent').style.setProperty('--fill', ((s.percent - 5) / 195 * 100) + '%');
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

  /* ---------- Editor de recorte ---------- */

  const crop = { it: null, ratio: 'free', rect: null, W: 0, H: 0 };
  const MIN = 24;

  function buildCropDialog() {
    const opts = [{ id: 'free', label: 'Libre' }, { id: 'original', label: 'Original' }].concat(RATIOS.slice(1));
    $('#cropRatios').innerHTML = opts.map((r) => `<button type="button" class="chip" data-v="${r.id}">${r.label}</button>`).join('');
    $('#cropRatios').addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      setCropRatio(b.dataset.v, true);
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
      const { it, rect, W, H } = crop;
      const full = rect.w >= W - 1 && rect.h >= H - 1;
      it.crop = full ? null : { x: rect.x / W, y: rect.y / H, w: rect.w / W, h: rect.h / H };
      if (it.result) it.result.version = -1;
      $('#cropDialog').close();
      updateCard(it);
      refreshChrome();
    });
    $('#cropRemove').addEventListener('click', () => {
      crop.it.crop = null;
      if (crop.it.result) crop.it.result.version = -1;
      $('#cropDialog').close();
      updateCard(crop.it);
      refreshChrome();
    });

    window.addEventListener('resize', () => {
      if (!$('#cropDialog').open) return;
      const prev = { W: crop.W, H: crop.H, r: crop.rect };
      measureCrop();
      const kx = crop.W / prev.W, ky = crop.H / prev.H;
      crop.rect = { x: prev.r.x * kx, y: prev.r.y * ky, w: prev.r.w * kx, h: prev.r.h * ky };
      drawCropBox();
    });
  }

  function measureCrop() {
    const img = $('#cropImg');
    crop.W = img.clientWidth;
    crop.H = img.clientHeight;
  }

  function openCrop(it) {
    if (it.status === 'invalid' || it.status === 'loading') return;
    crop.it = it;
    $('#cropName').textContent = `${it.file.name} · ${it.w}×${it.h}`;
    const img = $('#cropImg');
    img.src = it.url;
    $('#cropDialog').showModal();
    const start = () => {
      measureCrop();
      if (it.crop) {
        crop.ratio = 'free';
        crop.rect = { x: it.crop.x * crop.W, y: it.crop.y * crop.H, w: it.crop.w * crop.W, h: it.crop.h * crop.H };
        markCropRatio();
        drawCropBox();
      } else {
        setCropRatio(settings.cropRatio !== 'none' ? settings.cropRatio : 'free', true);
      }
    };
    if (img.complete && img.naturalWidth) requestAnimationFrame(start);
    else img.onload = () => requestAnimationFrame(start);
  }

  function markCropRatio() {
    $$('#cropRatios .chip').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === crop.ratio));
  }

  function currentRatio() {
    if (crop.ratio === 'free') return 0;
    return ratioValue(crop.ratio, crop.it);
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
    const { rect, W, H, it } = crop;
    if (!rect) return;
    const box = $('#cropBox');
    box.style.left = rect.x + 'px';
    box.style.top = rect.y + 'px';
    box.style.width = rect.w + 'px';
    box.style.height = rect.h + 'px';
    $('#cropSize').textContent = `${Math.round(rect.w / W * it.w)} × ${Math.round(rect.h / H * it.h)}`;
  }

  /* ---------- Entrada de archivos ---------- */

  function bindInput() {
    const dz = $('#dropzone');
    const input = $('#fileInput');
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    $('#addMoreBtn').addEventListener('click', () => input.click());
    $('#clearBtn').addEventListener('click', () => { if (!busy) clearAll(); });
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
    bindInput();
    syncPanel();
    refreshChrome();
  })();
})();
