// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/db"
import { PrismaAdapter } from "@auth/prisma-adapter" // <-- ADDED

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"], // <-- ADDED
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
// ... (Credentials login unchanged)
      },
      async authorize(creds) {
        if (creds?.email === "demo@ledgerleaf.app" && creds?.password === "demo") {
          const user = await prisma.user.upsert({
            where: { email: "demo@ledgerleaf.app" },
            update: { name: "Demo User" },
            create: { email: "demo@ledgerleaf.app", name: "Demo User" },
          })
          return { id: user.id, name: user.name ?? "Demo User", email: user.email }
        }
        return null
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // User object is provided on sign in (OAuth or Credentials)
      if (user) {
        token.id = user.id
        token.user = { 
          id: user.id, 
          name: user.name ?? null, 
          email: user.email ?? null 
        }
      }
      return token
    },
    async session({ session, token }) {
    // Session is called on every request, populate session.user.id from the token
    if (token && typeof token === "object" && "id" in token && typeof token.id === "string") {
      session.user.id = token.id
    }
    return session
  },
  },
}