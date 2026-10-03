/* Kasa PWA service worker — build sırasında vite.config.ts tarafından üretilir.
 * - Uygulamanın tüm dosyalarını önbelleğe alır (offline açılış).
 * - Yalnızca kendi origin'indeki GET isteklerine karışır; kur API'si gibi
 *   dış isteklere ASLA dokunmaz ve onları önbelleğe almaz.
 * - IndexedDB'ye (finansal veriler) hiçbir şekilde dokunmaz.
 */
const VERSION = '4b495fea49ccfa49';
const CACHE_PREFIX = 'kasa-app-';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const PRECACHE = [
  "./",
  "./index.html",
  "./assets/index-CARNiBh1.js",
  "./assets/index-Cg7K7euW.css",
  "./icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./manifest.webmanifest"
];
const INDEX_URL = new URL('./index.html', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE.map((path) => new Request(new URL(path, self.location.href).href, { cache: 'reload' }))),
    ),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage(VERSION);
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // dış istekler (kur API'si) doğrudan ağa gider

  if (request.mode === 'navigate') {
    // Uygulama kabuğu: önce önbellek → offline'da beyaz ekran olmaz.
    const shell = () => caches.match(INDEX_URL).then((c) => c || caches.match(new URL('./', self.location.href).href));
    event.respondWith(shell().then((cached) => cached || fetch(request)).catch(() => shell()));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
