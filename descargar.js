/* Página de descarga de la app de escritorio. Los datos de la versión
 * publicada (archivos, tamaños, huellas SHA-256) los escribe
 * desktop/scripts/publish.mjs en descargas/version.js. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const t = (s, p) => I18N.t(s, p);
  const SHA256_RE = /^[0-9a-f]{64}$/i;
  const FILE_RE = /^[\w.-]+\.exe$/;
  // Solo se aceptan enlaces a una Release de GitHub
  const RELEASE_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/download\/[\w.-]+\/[\w.-]+\.exe$/;

  function release() {
    const r = window.PIXELOTE_DOWNLOADS;
    if (!r || typeof r !== 'object' || !Array.isArray(r.files)) return null;
    // Solo se aceptan entradas con nombre de archivo y huella con formato válido
    const files = r.files.filter((f) => f && FILE_RE.test(f.file) && SHA256_RE.test(f.sha256) && f.size > 0);
    return files.length ? { version: String(r.version || ''), date: r.date, files } : null;
  }

  function fmtSize(bytes) {
    return new Intl.NumberFormat(I18N.lang, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + ' MB';
  }

  function setButton(sel, metaSel, file) {
    const a = $(sel);
    if (!file) {
      a.removeAttribute('href');
      a.removeAttribute('download');
      a.setAttribute('aria-disabled', 'true');
      a.classList.add('is-disabled');
      $(metaSel).textContent = t('No disponible');
      return;
    }
    // La Release de GitHub si existe; si no, la copia de la carpeta descargas/
    a.href = RELEASE_URL_RE.test(file.url || '') ? file.url : 'descargas/' + encodeURIComponent(file.file);
    a.setAttribute('download', file.file);
    a.removeAttribute('aria-disabled');
    a.classList.remove('is-disabled');
    $(metaSel).textContent = `.exe · ${fmtSize(file.size)}`;
  }

  function paint() {
    document.title = t('Descargar Pixelote para Windows');
    const r = release();
    const installer = r && r.files.find((f) => f.type === 'installer');
    const portable = r && r.files.find((f) => f.type === 'portable');
    setButton('#dlInstaller', '#dlInstallerMeta', installer);
    setButton('#dlPortable', '#dlPortableMeta', portable);
    $('#dlMissing').hidden = !!r;

    const date = r && r.date ? new Date(r.date) : null;
    $('#dlVersion').textContent = r
      ? t('Versión {v}', { v: r.version }) + (date && !isNaN(date) ? ' · ' + new Intl.DateTimeFormat(I18N.lang, { dateStyle: 'long' }).format(date) : '')
      : '';

    const box = $('#dlHashes');
    box.textContent = '';
    (r ? r.files : []).forEach((f) => {
      const row = document.createElement('div');
      row.className = 'dl-hash';
      const name = document.createElement('span');
      name.className = 'dl-hash-name';
      name.textContent = f.file;
      const code = document.createElement('code');
      code.textContent = f.sha256.toUpperCase();
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn ghost small';
      copy.textContent = t('Copiar');
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(f.sha256.toUpperCase()); copy.textContent = t('Copiado'); } catch (_) { /* sin portapapeles */ }
        setTimeout(() => { copy.textContent = t('Copiar'); }, 1500);
      });
      row.append(name, code, copy);
      box.append(row);
    });
  }

  I18N.init();
  PixeloteUI.setupTheme();
  PixeloteUI.setupLangPicker();
  PixeloteUI.setupFooter();
  I18N.onChange(paint);
  paint();
})();
