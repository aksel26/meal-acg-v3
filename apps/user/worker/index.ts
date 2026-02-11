/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
}

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
      } as ExtendedNotificationOptions)
    );
  } catch (err) {
    console.error("[worker] Push event error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/";
  const url = rawUrl.startsWith("/") ? rawUrl : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
