const CACHE_NAME = 'centurio-cache-v1';

// La liste de tous les fichiers à sauvegarder dans le téléphone
const urlsToCache = [
  '/',
  '/index.html',
  '/defis.html',
  '/contact.html',
  '/reglement.html',
  '/style.css',
  '/script.js',
  '/centurio-logo.png',
  '/centurio-favicon.ico'
];

// 1. Au premier chargement, on met tout en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('PWA : Fichiers mis en cache avec succès !');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Quand le visiteur navigue, on sert le cache s'il n'a pas internet
self.addEventListener('fetch', event => {
  // On ne bloque pas les requêtes vers l'API (la base de données)
  if (event.request.url.includes('/api/')) {
      return; 
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si le fichier est en cache, on le donne instantanément (même sans 4G)
        if (response) {
          return response;
        }
        // Sinon, on va le chercher sur internet normalement
        return fetch(event.request);
      })
  );
});
