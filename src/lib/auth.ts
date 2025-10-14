// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/db"
// 1. Import Prisma Adapter
import { PrismaAdapter } from "@auth/prisma-adapter"

export const authOptions: NextAuthOptions = {
  // 2. Add the Adapter (must be first!)
  adapter: PrismaAdapter(prisma), 
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (creds?.email === "demo@ledgerleaf.app" && creds?.password === "demo") {
          const user = await prisma.user.upsert({
            where: { email: "demo@ledgerleaf.app" },
            update: { name: "Demo User" },
            // Ensure demo account fields match the model (User has name, email, id)
            create: { email: "demo@ledgerleaf.app", name: "Demo User", id: "user_demo" }, 
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
      // If a user signs in (either credentials or OAuth)
      if (user) {
        // Overwrite token.id with the user's database ID
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
      // Set the session user's ID from the token ID
      if (token && typeof token.id === "string") {
        session.user.id = token.id
      }
      return session
  },
  },
}