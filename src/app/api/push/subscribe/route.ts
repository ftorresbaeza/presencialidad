import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { endpoint, p256dh, auth, personId } = body;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, personId: personId || null },
    create: { endpoint, p256dh, auth, personId: personId || null },
  });

  return NextResponse.json(subscription, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { endpoint } = body;
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
