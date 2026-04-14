// On passe à la V30 pour forcer les téléphones à supprimer le vieux cache buggé
const CACHE_NAME = 'centurio-cache-v30';

// La liste de TOUT ce qui est vital pour que l'appli tourne sans Internet
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
  '/manifest.json' // CRUCIAL : Ne jamais l'oublier !
];

// 1. INSTALLATION : L'application télécharge ces fichiers en douce la 1ère fois
self.addEventListener('install', event => {
  self.skipWaiting(); // Force l'installation immédiate sans attendre
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ PWA : Fichiers vitaux téléchargés pour le mode hors-ligne !');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. NETTOYAGE : L'application supprime les vieilles versions du cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ PWA : Ancien cache supprimé ->', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle du téléphone immédiatement
  );
});

// 3. INTERCEPTION : C'est ici que la magie hors-ligne opère
self.addEventListener('fetch', event => {
  // On ignore volontairement les requêtes vers la base de données (API) et la radio (WebSockets)
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) {
      return; 
  }

  event.respondWith(
    // ignoreSearch: true = On s'en fiche s'il y a un ?admin=open à la fin de l'URL, on charge la page quand même !
    caches.match(event.request, { ignoreSearch: true })
      .then(cachedResponse => {
        // 1er Choix : Si le fichier est dans la mémoire du téléphone, on le donne instantanément (Même sans réseau)
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2ème Choix : S'il n'est pas en mémoire, on essaie d'aller le chercher sur Internet
        return fetch(event.request).catch(() => {
            // FILET DE SÉCURITÉ ULTIME : 
            // Si on a plus de réseau (catch) et que l'utilisateur cherchait une page (HTML)...
            // On le force à afficher l'accueil depuis la mémoire au lieu de l'écran du dinosaure !
            if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
            }
        });
      })
  );
});
