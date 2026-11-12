/* Build-time injected shell only. Never cache API responses or account data here. */
const CACHE = '__CACHE_NAME__';
const SHELL = __PRECACHE__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ntbk-shell-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(cached => cached || fetch(event.request)));
  } else if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request, { ignoreVary: true })).then(cached => cached || fetch(event.request)));
  }
});
