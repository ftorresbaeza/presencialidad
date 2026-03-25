import webpush from "web-push";

let initialized = false;

function init() {
  if (initialized) return;
  const email = process.env.VAPID_EMAIL;
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  if (email && pubKey && privKey && privKey !== "your_vapid_private_key_here") {
    webpush.setVapidDetails(email, pubKey, privKey);
    initialized = true;
  }
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
) {
  init();
  if (!initialized) return;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    console.error("Push notification failed:", err);
  }
}
