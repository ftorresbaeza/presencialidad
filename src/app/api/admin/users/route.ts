import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  return dbUser?.role === "ADMIN" ? dbUser : null;
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      personId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { userId, role, personId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (personId !== undefined) data.personId = personId;

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json(updated);
}
