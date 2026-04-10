// On passe à la version 25 pour forcer les téléphones à tout retélécharger !
const CACHE_NAME = 'centurio-cache-v25';

const urlsToCache = [
  '/',
  '/index.html',
  '/defis.html',
  '/contact.html',
  '/reglement.html',
  '/style.css',
  '/script.js',
  '/centurio-logo.png',
  '/centurio-gaming-zone-bg.jpg' // On ajoute l'image de fond pour le hors-ligne !
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force l'installation immédiate
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ PWA : Nouveaux fichiers v25 mis en cache !');
        return cache.addAll(urlsToCache);
      })
  );
});

// ÉTAPE CRUCIALE : On supprime les vieux caches (les anciennes versions du design)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ PWA : Ancien cache supprimé', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
      return; 
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
