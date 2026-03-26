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

  // Only users who have registered via Google (have a linked User account)
  const linkedUsers = await prisma.user.findMany({
    where: { personId: { not: null } },
    select: { personId: true },
  });
  const linkedPersonIds = linkedUsers.map(u => u.personId as string);

  // Admins get the list of registered persons (only those linked to a Google account)
  const allPeople = isAdmin && linkedPersonIds.length > 0
    ? await prisma.person.findMany({
        where: { id: { in: linkedPersonIds }, active: true },
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
