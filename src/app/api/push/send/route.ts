import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/webpush";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, body: msgBody, url } = body;

  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;

  for (const sub of subs) {
    await sendPushNotification(sub, { title, body: msgBody, url: url || "/" });
    sent++;
  }

  return NextResponse.json({ sent });
}
