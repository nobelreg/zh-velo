self.addEventListener('install', (e) => {
	// console.log(' ... ', e.request.url);
 e.waitUntil(
   caches.open('pwa-zh-velo').then((cache) => {
     return cache.addAll([
       // '/pwa-examples/a2hs/',
       '/',
       '/index.html',
       '/js/app.js',
       '/css/styles.css',
       '/img/loading.svg',
       '/img/favicon-16x16.png',
       '/img/favicon-32x32.png',
       '/img/favicon-96x96.png',
     ]);
   })
 );
});

self.addEventListener('fetch', (e) => {
  console.log(e.request.url);
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});