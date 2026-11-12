// Звукач — офлайн-кэш.
// Игра открывается из кэша мгновенно и без интернета; если есть сеть, новая версия
// тихо подкачивается в фоне и включится при следующем запуске.
// При каждом обновлении игры меняй номер версии ниже.
const VERSION = 'zvukach-v7';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' — берём файлы прямо с сервера, а не из кэша браузера (там может лежать старая версия до 10 минут)
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // свои файлы и шрифты Google: отдаём из кэша, параллельно обновляем
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    // свои файлы всегда сверяем с сервером (no-cache), иначе браузер до 10 минут отдаёт старую версию
    const own = new URL(req.url).origin === self.location.origin;
    const net = (own ? fetch(req.url, { cache: 'no-cache' }) : fetch(req)).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
