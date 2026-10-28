// 超级飞侠大救援 — Service Worker
// 版本号：每次更新游戏时改这里，旧缓存会自动清除
const CACHE_NAME = 'superwings-v1';

// 需要缓存的文件（离线也能玩！）
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// 安装：预缓存所有资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 缓存游戏资源...');
      // 逐个缓存，单个失败不影响整体
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] 缓存失败:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// 激活：清除旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] 删除旧缓存:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 拦截请求：优先用缓存，失败再走网络
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // Google Fonts 等外部请求：网络优先，失败用缓存
  const url = new URL(event.request.url);
  const isExternal = url.origin !== self.location.origin;

  if (isExternal) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // 顺带缓存外部资源
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 本地资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
