import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Adapter } from "next-auth/adapters";
import dns from "node:dns";

// Ensure IPv4 is attempted first to avoid IPv6 timeout errors on campus/firewalled networks
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where not supported
}

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        const isProfessor = email === process.env.PROFESSOR_EMAIL?.toLowerCase();
        const isAdmin = !!email && getConfiguredAdminEmails().includes(email);

        if (email && (email.endsWith("@nitc.ac.in") || isProfessor || isAdmin)) {
          return true;
        }
        return "/unauthorized";
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        const email = dbUser?.email?.toLowerCase();
        const isAdmin = !!email && getConfiguredAdminEmails().includes(email);
        const isProfessor = email === process.env.PROFESSOR_EMAIL?.toLowerCase();

        // Configured admin accounts take precedence; the PoP account remains a professor.
        if (dbUser && isAdmin && dbUser.role !== "ADMIN") {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
          session.user.role = "ADMIN";
        } else if (dbUser && isProfessor && dbUser.role !== "PROFESSOR") {
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
