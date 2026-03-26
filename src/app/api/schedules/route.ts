import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusCode } from "@prisma/client";
import { sendPushNotification } from "@/lib/webpush";

/** Parse "yyyy-MM-dd" as a local-midnight Date to avoid UTC offset issues */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || "");
  const month = parseInt(searchParams.get("month") || ""); // 1-based

  if (!year || !month) {
    return NextResponse.json({ error: "year and month required" }, { status: 400 });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const schedules = await prisma.schedule.findMany({
    where: { date: { gte: start, lte: end } },
    include: { person: { select: { id: true, name: true, type: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { personId, date, status } = body;

  if (!personId || !date || !status) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  // Parse as local date to avoid UTC-offset rejecting "today" in Chile
  const scheduleDate = parseLocalDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scheduleDate < today) {
    return NextResponse.json({ error: "No puedes editar fechas pasadas" }, { status: 400 });
  }

  const schedule = await prisma.schedule.upsert({
    where: { personId_date: { personId, date: scheduleDate } },
    update: { status: status as StatusCode },
    create: { personId, date: scheduleDate, status: status as StatusCode },
    include: { person: { select: { name: true } } },
  });

  // Push notifications for Of reservations
  if (status === "Of") {
    const config = await prisma.config.findUnique({ where: { id: "main" } });
    const maxSeats = config?.maxSeats || 30;

    const officeCount = await prisma.schedule.count({
      where: { date: scheduleDate, status: "Of" },
    });

    const subs = await prisma.pushSubscription.findMany();

    if (officeCount >= Math.ceil(maxSeats * 0.9)) {
      const remaining = maxSeats - officeCount;
      for (const sub of subs) {
        await sendPushNotification(sub, {
          title: "Oficina casi llena",
          body: `Solo quedan ${remaining} puestos para el ${scheduleDate.toLocaleDateString("es-CL")}`,
          url: "/",
        });
      }
    } else {
      for (const sub of subs) {
        await sendPushNotification(sub, {
          title: "Nueva reserva en oficina",
          body: `${schedule.person.name} estará en oficina el ${scheduleDate.toLocaleDateString("es-CL")}`,
          url: "/",
        });
      }
    }
  }

  return NextResponse.json(schedule, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");
  const date = searchParams.get("date");

  if (!personId || !date) {
    return NextResponse.json({ error: "personId and date required" }, { status: 400 });
  }

  const scheduleDate = parseLocalDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scheduleDate < today) {
    return NextResponse.json({ error: "No puedes eliminar fechas pasadas" }, { status: 400 });
  }

  await prisma.schedule.deleteMany({
    where: { personId, date: scheduleDate },
  });

  return NextResponse.json({ ok: true });
}
