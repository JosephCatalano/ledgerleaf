import "./globals.css"
import type { Metadata } from "next"
import NextAuthSessionProvider from "@/components/providers/session-provider"

export const metadata: Metadata = {
  title: "LedgerLeaf",
  description: "Mint-style finance app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
      </body>
    </html>
  )
}
