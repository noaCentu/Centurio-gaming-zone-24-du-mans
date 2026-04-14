const CACHE_NAME = 'centurio-cache-v31';

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

// 1. INSTALLATION : Mode "Anti-Crash"
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ PWA : Téléchargement du cache en cours...');
      // Cette méthode force le cache même si un fichier manque !
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.log('⚠️ Fichier introuvable ignoré :', url));
        })
      );
    })
  );
});

// 2. ACTIVATION : Nettoyage des vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. RÉCUPÉRATION : La magie Hors-Ligne
self.addEventListener('fetch', event => {
  // On ignore les appels à la base de données
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(response => {
      // Si on a le fichier en mémoire, on le donne !
      if (response) {
        return response;
      }
      
      // Sinon on essaie Internet...
      return fetch(event.request).catch(() => {
        // Si Internet est coupé (Mode Avion) et qu'on cherche une page Web, on renvoie l'accueil
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
