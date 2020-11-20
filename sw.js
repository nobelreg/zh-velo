self.addEventListener('install', (e) => {
 // console.log(' ... ', e.request.url);
 e.waitUntil(
   caches.open('pwa-zh-velo').then((cache) => {
     return cache.addAll([
       '/',
       '/index.html',
       '/assets/js/app.js', // inject:css
       '/assets/css/styles-5038f836f6.css',
       // endinject
       '/assets/img/loading.svg',
       '/assets/img/android-icon-192x192.png',
       '/assets/img/favicon-16x16.png',
       '/assets/img/favicon-32x32.png',
       '/assets/img/favicon-96x96.png',
     ]);
   })
 );
});

self.addEventListener('fetch', (e) => {
  // console.log(e.request.url);
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});