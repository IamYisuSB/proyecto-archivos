/* Service worker: permite instalar Pixelote y usarlo sin conexión.
 *
 * - Archivos de la app: se guardan al instalar y se sirven desde la caché,
 *   actualizándose en segundo plano (stale-while-revalidate).
 * - Códecs del CDN (HEIC, TIFF, AVIF, MozJPEG): sus URL llevan versión fija,
 *   así que se guardan la primera vez que se usan y luego salen de la caché. */
const VERSION = 'pixelote-v8';
const CDN_CACHE = 'pixelote-cdn';
const SHELL = [
  './',
  './index.html',
  './heic-sandbox.html',
  './config.js',
  './styles.css',
  './styles-moderno.css',
  './i18n.js',
  './encoders.js',
  './pipeline.js',
  './decoders.js',
  './app.js',
  './manifest.webmanifest',
  './icons/logo.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== CDN_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(CDN_CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreVary: true });
      // Una copia "opaca" no sirve para comprobar la huella (SRI) de una petición CORS
      if (hit && !(hit.type === 'opaque' && req.mode === 'cors')) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req)
      .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    if (hit) { e.waitUntil(network); return hit; }
    const res = await network;
    if (res) return res;
    // Sin conexión y sin copia: para la navegación, la página principal
    if (req.mode === 'navigate') return cache.match('./index.html');
    return Response.error();
  }));
});
