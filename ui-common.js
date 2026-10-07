/* Piezas de interfaz compartidas por la app (index.html) y la página de
 * descarga (descargar.html): selector de idioma con banderas, botón de tema
 * claro / oscuro y el pie de página. Necesita i18n.js cargado antes. */
(function (global) {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const t = (s, p) => I18N.t(s, p);
  // Dentro de la app de escritorio (Tauri)
  const IS_DESKTOP = !!global.__TAURI_INTERNALS__;
  const THEME_KEY = 'pixelote.theme';

  /* ---------- Tema claro / oscuro ---------- */

  function setupTheme() {
    const btn = $('#themeBtn');
    if (!btn) return () => {};
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
      try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* sin almacenamiento */ }
      paint();
    });
    media.addEventListener('change', paint);
    I18N.onChange(paint);
    paint();
    return paint;
  }

  /* ---------- Idioma con banderas ---------- */

  // Banderas en SVG (los emojis de bandera no se ven en Windows). `uid` evita
  // ids repetidos cuando la misma bandera aparece varias veces.
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

  function setupLangPicker() {
    const btn = $('#langBtn');
    const menu = $('#langMenu');
    if (!btn || !menu) return;
    menu.innerHTML = I18N.LANGS.map((l) =>
      `<li role="option" tabindex="-1" data-lang="${l}" lang="${l}"><span class="flag" aria-hidden="true">${flagSvg(l, 'flag-m-' + l)}</span><span>${LANG_NAMES[l]}</span></li>`).join('');
    const options = () => Array.from(menu.querySelectorAll('[role="option"]'));
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
    I18N.onChange(paintButton);
    paintButton();
  }

  /* ---------- Pie de página ---------- */

  function setupFooter() {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
    // En la app de escritorio no hay navegador, y no tiene sentido ofrecer descargarla
    document.querySelectorAll('.web-only').forEach((el) => { el.hidden = IS_DESKTOP; });
    const copy = $('#footerCopy');
    if (!copy || !IS_DESKTOP) return;
    const paint = () => {
      copy.textContent = t('Convierte tus imágenes sin subirlas a ningún sitio: todo ocurre en tu equipo, así que tus fotos siguen siendo solo tuyas.');
    };
    I18N.onChange(paint);
    paint();
  }

  global.PixeloteUI = { IS_DESKTOP, setupTheme, setupLangPicker, setupFooter, flagSvg, LANG_NAMES };
})(window);
