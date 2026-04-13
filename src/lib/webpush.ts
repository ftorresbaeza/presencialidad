import webpush from "web-push";

let initialized = false;

function init() {
  if (initialized) return;
  const email = process.env.VAPID_EMAIL?.trim();
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const rawPrivKey = process.env.VAPID_PRIVATE_KEY ?? "";
  // Normalize to URL-safe base64 without padding (some env tools add newlines or use standard base64)
  const privKey = rawPrivKey.trim().replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  console.log(`[webpush] init email=${!!email} pubKey=${!!pubKey} privKeyLen=${privKey.length}`);
  if (email && pubKey && privKey && privKey !== "your_vapid_private_key_here") {
    webpush.setVapidDetails(email, pubKey, privKey);
    initialized = true;
  }
}

export function isVapidInitialized(): boolean {
  init();
  return initialized;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  init();
  if (!initialized) {
    console.warn("Push skipped: VAPID not initialized. Check VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY env vars.");
    return false;
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    console.error("Push notification failed:", err);
    return false;
  }
}
