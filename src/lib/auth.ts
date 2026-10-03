import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const isProfessor = user.email === process.env.PROFESSOR_EMAIL;
        if (user.email && (user.email.endsWith("@nitc.ac.in") || isProfessor)) {
          return true;
        } else {
          return "/unauthorized"; // Custom error page
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch role if not already in session. Wait, the adapter handles user role if we extend the user model.
        // We need to fetch the user's role and add it to the session.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        
        // Auto-assign admin if email matches
        if (dbUser && dbUser.email === process.env.PROFESSOR_EMAIL && dbUser.role !== "PROFESSOR") {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "PROFESSOR" },
          });
          session.user.role = "PROFESSOR";
        } else if (dbUser) {
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
  },
  pages: {
    error: "/unauthorized",
  },
};
