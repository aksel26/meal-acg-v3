import webpush from "web-push";

let isConfigured = false;

function ensureConfigured() {
  if (isConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@acg.com";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

export interface PushSendResult {
  endpoint: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<PushSendResult> {
  try {
    ensureConfigured();

    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );

    return {
      endpoint: subscription.endpoint,
      success: true,
      statusCode: result.statusCode,
    };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const message = error instanceof Error ? error.message : "Unknown error";

    return {
      endpoint: subscription.endpoint,
      success: false,
      statusCode,
      error: message,
    };
  }
}
