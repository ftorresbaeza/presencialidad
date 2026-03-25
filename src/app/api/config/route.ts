import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.config.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", maxSeats: 30 },
  });
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { maxSeats } = body;
  if (!maxSeats || maxSeats < 1) {
    return NextResponse.json({ error: "maxSeats must be >= 1" }, { status: 400 });
  }
  const config = await prisma.config.upsert({
    where: { id: "main" },
    update: { maxSeats },
    create: { id: "main", maxSeats },
  });
  return NextResponse.json(config);
}
