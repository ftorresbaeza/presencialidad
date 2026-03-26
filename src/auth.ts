import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Auto-link by email on first login
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser && !dbUser.personId && dbUser.email) {
          const person = await prisma.person.findFirst({
            where: { email: { equals: dbUser.email, mode: "insensitive" }, active: true },
          });
          if (person) {
            await prisma.user.update({ where: { id: user.id }, data: { personId: person.id } });
            token.personId = person.id;
            token.personName = person.name;
          }
        } else if (dbUser?.personId) {
          const person = await prisma.person.findUnique({ where: { id: dbUser.personId } });
          token.personId = dbUser.personId;
          token.personName = person?.name;
        }
      }
      // Refresh personId on subsequent requests
      if (trigger === "update" || (!token.personId && token.id)) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (dbUser?.personId) {
          const person = await prisma.person.findUnique({ where: { id: dbUser.personId } });
          token.personId = dbUser.personId;
          token.personName = person?.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { personId?: string; personName?: string }).personId = token.personId as string | undefined;
        (session.user as { personId?: string; personName?: string }).personName = token.personName as string | undefined;
      }
      return session;
    },
  },
});
