import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user!.id } });
  const personId = dbUser?.personId || null;
  const isAdmin = dbUser?.role === "ADMIN";

  const currentPerson = personId
    ? await prisma.person.findUnique({
        where: { id: personId },
        select: { id: true, name: true, type: true },
      })
    : null;

  const config = await prisma.config.findUnique({ where: { id: "main" } });

  // Admins get the full people list to assign schedules
  const allPeople = isAdmin
    ? await prisma.person.findMany({
        where: { active: true },
        select: { id: true, name: true, type: true },
        orderBy: { name: "asc" },
      })
    : currentPerson ? [currentPerson] : [];

  return (
    <HomeClient
      currentPerson={currentPerson}
      maxSeats={config?.maxSeats || 30}
      userName={session.user?.name || session.user?.email || "Usuario"}
      userImage={session.user?.image || null}
      isAdmin={isAdmin}
      allPeople={allPeople}
    />
  );
}
