// DesabaChat Service Worker
// Versão: 3.0.0

const CACHE_NAME = 'desabachat-v3.0.0';
const OFFLINE_URL = 'offline.html';

// Recursos a serem cacheados na instalação
const urlsToCache = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/supabase.min.js',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="20" fill="%23ff6b4a"/%3E%3Ctext x="50" y="68" font-size="50" text-anchor="middle" fill="white" font-family="sans-serif"%3E🗣%3C/text%3E%3C/svg%3E'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Instalação completa!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro na instalação:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Ativação completa!');
        return self.clients.claim();
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar requisições para o Supabase (API)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // Estratégia: Cache First, depois Network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Atualizar cache em background
          event.waitUntil(
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME)
                    .then((cache) => {
                      cache.put(request, responseToCache);
                    });
                }
              })
              .catch(() => {
                // Erro na rede, manter cache
              })
          );
          return cachedResponse;
        }

        // Se não está no cache, buscar da rede
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Se a requisição falhar e for uma página, mostrar offline
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Sincronização em segundo plano (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    console.log('[SW] Sincronizando posts pendentes...');
    event.waitUntil(syncPendingPosts());
  }
});

// Notificações Push
self.addEventListener('push', (event) => {
  console.log('[SW] Notificação recebida:', event);
  
  let data = {
    title: 'DesabaChat',
    body: 'Nova atividade no DesabaChat!',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/badge-72x72.png',
    tag: 'desabachat-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir App'
      },
      {
        action: 'dismiss',
        title: 'Ignorar'
      }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, data)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow('./');
      })
  );
});

// Função para sincronizar posts pendentes
async function syncPendingPosts() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingPosts = await cache.match('pending-posts.json');
    
    if (pendingPosts) {
      const posts = await pendingPosts.json();
      console.log('[SW] Posts pendentes:', posts);
      // Aqui você pode adicionar lógica para reenviar posts
      // que não foram publicados por falta de internet
      
      // Limpar posts pendentes após sincronizar
      await cache.delete('pending-posts.json');
    }
  } catch (error) {
    console.error('[SW] Erro ao sincronizar posts:', error);
  }
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
