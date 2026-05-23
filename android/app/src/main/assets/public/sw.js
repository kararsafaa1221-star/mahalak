self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {
    title: 'تنبيه جديد من محلك',
    body: 'لديك إشعار جديد بانتظارك!'
  };

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    data: data.data || {},
    vibrate: [100, 50, 100],
    dir: 'rtl',
    lang: 'ar-IQ'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // فتح التطبيق عند النقر
  );
});
