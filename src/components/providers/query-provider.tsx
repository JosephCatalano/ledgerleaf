// src/components/providers/QueryProvider.tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as React from "react"

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
