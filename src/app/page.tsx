import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user!.id } });
  const personId = dbUser?.personId || null;

  const currentPerson = personId
    ? await prisma.person.findUnique({
        where: { id: personId },
        select: { id: true, name: true, type: true },
      })
    : null;

  const config = await prisma.config.findUnique({ where: { id: "main" } });

  return (
    <HomeClient
      currentPerson={currentPerson}
      maxSeats={config?.maxSeats || 30}
      userName={session.user?.name || session.user?.email || "Usuario"}
      userImage={session.user?.image || null}
    />
  );
}
