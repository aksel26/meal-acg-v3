const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function waitForActivation(reg: ServiceWorkerRegistration): Promise<boolean> {
  if (reg.active) return true;

  const installing = reg.installing || reg.waiting;
  if (!installing) return false;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    installing.addEventListener("statechange", () => {
      if (installing.state === "activated") {
        clearTimeout(timeout);
        resolve(true);
      } else if (installing.state === "redundant") {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg = await navigator.serviceWorker.register("/push-sw.js");
    const activated = await waitForActivation(reg);
    if (activated) return navigator.serviceWorker.ready;
  } catch {
    return null;
  }

  return null;
}

export async function subscribeToPush(memberId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("VAPID public key is not configured");
    return false;
  }

  try {
    const registration = await getReadyRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");

    if (!key || !auth) return false;

    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        subscription: {
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        },
        userAgent: navigator.userAgent,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Push subscription failed:", error);
    return false;
  }
}

export async function unsubscribeFromPush(memberId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await getReadyRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          endpoint: subscription.endpoint,
        }),
      });

      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error("Push unsubscription failed:", error);
    return false;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await getReadyRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}
