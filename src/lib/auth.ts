import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/db"

export const authOptions: NextAuthOptions = {
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
      if (user) {
        token.user = { 
          id: user.id, 
          name: user.name ?? null, 
          email: user.email ?? null 
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string; // Add the user id from the token to the session
      }
      return session;
    },
  },
}
