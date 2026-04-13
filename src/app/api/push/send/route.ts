import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, isVapidInitialized } from "@/lib/webpush";

export async function POST(req: NextRequest) {
  const vapidOk = isVapidInitialized();
  if (!vapidOk) {
    return NextResponse.json({
      sent: 0,
      error: "VAPID no configurado. Verifica las variables de entorno: VAPID_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.",
    }, { status: 500 });
  }

  const body = await req.json();
  const { title, body: msgBody, url } = body;

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, error: "No hay suscriptores registrados." });
  }

  let sent = 0;
  for (const sub of subs) {
    const ok = await sendPushNotification(sub, { title, body: msgBody, url: url || "/" });
    if (ok) sent++;
  }

  return NextResponse.json({ sent, total: subs.length });
}
