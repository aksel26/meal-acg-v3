// Push notification service worker. This does not cache application resources.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || "/icons/android/android-launchericon-192-192.png",
        badge: "/icons/android/android-launchericon-96-96.png",
        tag: data.tag || "default",
        data: { url: data.url || "/" },
        renotify: true,
      })
    );
  } catch (err) {
    console.error("[push-sw] Failed to handle push event:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  const safeUrl = url.startsWith("/") ? url : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(safeUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(safeUrl);
      })
  );
});
