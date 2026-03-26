import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

async function autoLinkPerson(userId: string, email: string | null, name: string | null) {
  // 1. Match by email
  if (email) {
    const person = await prisma.person.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, active: true },
    });
    if (person) {
      await prisma.user.update({ where: { id: userId }, data: { personId: person.id } });
      return person;
    }
  }
  // 2. Match by Google display name
  if (name) {
    const person = await prisma.person.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, active: true },
    });
    if (person) {
      await prisma.user.update({ where: { id: userId }, data: { personId: person.id } });
      return person;
    }
  }
  // 3. Create new Person
  const displayName = name || email?.split("@")[0] || "Usuario";
  const newPerson = await prisma.person.create({
    data: { name: displayName, email: email || undefined, active: true },
  });
  await prisma.user.update({ where: { id: userId }, data: { personId: newPerson.id } });
  return newPerson;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in: user object is present
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.role = dbUser?.role ?? "USER";
        if (dbUser && !dbUser.personId) {
          const person = await autoLinkPerson(user.id, dbUser.email ?? null, dbUser.name ?? null);
          token.personId = person.id;
          token.personName = person.name;
        } else if (dbUser?.personId) {
          const person = await prisma.person.findUnique({ where: { id: dbUser.personId } });
          token.personId = dbUser.personId;
          token.personName = person?.name;
        }
      }

      // On every request: refresh if personId missing in token
      if (!token.personId && token.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) {
          token.role = dbUser.role;
          if (!dbUser.personId) {
            const person = await autoLinkPerson(token.id as string, dbUser.email ?? null, dbUser.name ?? null);
            token.personId = person.id;
            token.personName = person.name;
          } else {
            const person = await prisma.person.findUnique({ where: { id: dbUser.personId } });
            token.personId = dbUser.personId;
            token.personName = person?.name;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { personId?: string; personName?: string; role?: string }).personId = token.personId as string | undefined;
        (session.user as { personId?: string; personName?: string; role?: string }).personName = token.personName as string | undefined;
        (session.user as { personId?: string; personName?: string; role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
});
