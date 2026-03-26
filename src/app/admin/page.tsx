import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "@/components/AdminClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user!.id } });
  if (dbUser?.role !== "ADMIN") redirect("/");

  return <AdminClient />;
}
