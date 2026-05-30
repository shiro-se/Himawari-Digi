self.addEventListener('push', function(event) {
  if (event.data) {
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Pesan Baru', body: event.data.text() };
    }

    const title = data.title || 'HimawariDigi Chat';
    const options = {
      body: data.body || 'Anda memiliki pesan baru.',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      }
    };
    const showPromise = self.registration.showNotification(title, options).catch((err) => {
      console.error('Failed to show notification with icon', err);
      // Fallback tanpa icon jika path icon error
      delete options.icon;
      return self.registration.showNotification(title, options);
    });

    event.waitUntil(showPromise);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // Focus if it's our origin
        if (client.url.includes(new URL(targetUrl, self.location.origin).href) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
