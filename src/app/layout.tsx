import "./globals.css"
import type { Metadata } from "next"
import NextAuthSessionProvider from "@/components/providers/session-provider"
import { QueryProvider } from "@/lib/providers/query-provider"

export const metadata: Metadata = {
  title: "LedgerLeaf",
  description: "Mint-style finance app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextAuthSessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}
