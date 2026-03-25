import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PersonType } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, type, email, active } = body;

  const person = await prisma.person.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(type !== undefined && { type: type as PersonType }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json(person);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.person.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
