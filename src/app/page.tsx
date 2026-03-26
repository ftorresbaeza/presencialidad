import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  // Get personId linked to this user
  const dbUser = await prisma.user.findUnique({ where: { id: session.user!.id } });
  const personId = dbUser?.personId || null;

  // Get all active people for the link selector (if needed)
  const people = await prisma.person.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });

  // Get person details if linked
  const currentPerson = personId
    ? people.find((p) => p.id === personId) || null
    : null;

  // Get config
  const config = await prisma.config.findUnique({ where: { id: "main" } });
  const maxSeats = config?.maxSeats || 30;

  const userName = session.user?.name || session.user?.email || "Usuario";
  const userImage = session.user?.image || null;

  return (
    <HomeClient
      people={people}
      currentPerson={currentPerson}
      maxSeats={maxSeats}
      userName={userName}
      userImage={userImage}
      isLinked={!!personId}
    />
  );
}
