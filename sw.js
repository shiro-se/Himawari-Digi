// ── Service Worker Lifecycle ─────────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  self.skipWaiting(); // Langsung aktif tanpa menunggu tab lama ditutup
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activated!');
  event.waitUntil(self.clients.claim()); // Ambil alih semua halaman segera
});

// ── Push Event ──────────────────────────────────────────────
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received!', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Pesan Baru', body: event.data.text() };
    }
  }

  const title = data.title || 'HimawariDigi Chat';
  const options = {
    body: data.body || 'Anda memiliki pesan baru.',
    vibrate: [200, 100, 200],
    tag: 'himawari-push-' + Date.now(), // Unique tag agar tidak di-merge
    renotify: true, // Selalu bunyi walau tag sama
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click ──────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
