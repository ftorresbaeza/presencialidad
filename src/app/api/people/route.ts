import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PersonType } from "@prisma/client";

export async function GET() {
  const people = await prisma.person.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, email } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const person = await prisma.person.create({
    data: {
      name: name.trim(),
      type: (type as PersonType) || PersonType.INTERNAL,
      email: email?.trim() || null,
    },
  });
  return NextResponse.json(person, { status: 201 });
}
