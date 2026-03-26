import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    include: { person: { select: { id: true, name: true, type: true } } },
  });

  const map = new Map<string, {
    id: string; name: string; type: string;
    office: number; remote: number; travel: number; total: number;
  }>();

  for (const s of schedules) {
    const p = s.person;
    if (!map.has(p.id)) {
      map.set(p.id, { id: p.id, name: p.name, type: p.type, office: 0, remote: 0, travel: 0, total: 0 });
    }
    const entry = map.get(p.id)!;
    entry.total++;
    if (s.status === "Of") entry.office++;
    else if (s.status === "Tb") entry.remote++;
    else if (["DCH", "DMH", "DS", "DV", "DET"].includes(s.status)) entry.travel++;
  }

  const all = Array.from(map.values());

  return NextResponse.json({
    topOffice: [...all].sort((a, b) => b.office - a.office).slice(0, 10),
    topTravel: [...all].sort((a, b) => b.travel - a.travel).slice(0, 10),
    topRemote: [...all].sort((a, b) => b.remote - a.remote).slice(0, 10),
    topTotal: [...all].sort((a, b) => b.total - a.total).slice(0, 10),
  });
}
