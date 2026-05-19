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

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !isStandalonePWA();
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
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length > 0) {
    if (process.env.NODE_ENV === "development") {
      const fullPwaRegistrations = registrations.filter((reg) =>
        reg.active?.scriptURL.endsWith("/sw.js"),
      );
      for (const reg of fullPwaRegistrations) {
        await reg.unregister();
      }
      if (fullPwaRegistrations.length > 0) {
        await navigator.serviceWorker.register("/push-sw.js");
      }
    }
    return navigator.serviceWorker.ready;
  }

  if (process.env.NODE_ENV === "development") {
    await navigator.serviceWorker.register("/push-sw.js");
    return navigator.serviceWorker.ready;
  }

  // Turbopack dev mode 등에서 next-pwa가 SW를 자동 등록하지 못한 경우 수동 등록
  // 1) sw.js (full PWA) 시도
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const activated = await waitForActivation(reg);
    if (activated) return navigator.serviceWorker.ready;
  } catch {
    // sw.js 등록 실패
  }

  // 2) sw.js install 실패 시 push-sw.js (push-only) 폴백
  try {
    // 실패한 sw.js registration 정리
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (!reg.active) await reg.unregister();
    }
    await navigator.serviceWorker.register("/push-sw.js");
    return navigator.serviceWorker.ready;
  } catch {
    return null;
  }
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
