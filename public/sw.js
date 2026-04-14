const CACHE_NAME = 'centurio-cache-v32';

const urlsToCache = [
  '/',
  '/index.html',
  '/defis.html',
  '/contact.html',
  '/reglement.html',
  '/style.css',
  '/script.js',
  '/centurio-logo.png',
  '/centurio-gaming-zone-bg.jpg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ PWA : Mise en cache v32 en cours...');
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.log('⚠️ Ignoré :', url));
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignorer les requêtes serveur
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(response => {
      // 1. Le fichier est en mémoire exact ? On le donne.
      if (response) return response;

      // 2. BIDOUILLE APPLE : S'il cherche juste "monsite.com/", on lui force "index.html"
      if (event.request.url.endsWith('/')) {
        return caches.match('/index.html');
      }
      
      // 3. Sinon on cherche sur Internet.
      return fetch(event.request).catch(() => {
        // 4. Si Internet est coupé (Mode Avion) ET qu'il veut une page HTML, on sauve les meubles :
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
