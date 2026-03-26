import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Link authenticated user to a Person profile
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { personId } = await req.json();
  if (!personId) {
    return NextResponse.json({ error: "personId requerido" }, { status: 400 });
  }

  // Check person exists and is active
  const person = await prisma.person.findUnique({ where: { id: personId, active: true } });
  if (!person) {
    return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
  }

  // Check no other user is linked to this person
  const existing = await prisma.user.findFirst({
    where: { personId, id: { not: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Este perfil ya está vinculado a otra cuenta" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { personId },
  });

  return NextResponse.json({ ok: true, personId, personName: person.name });
}
