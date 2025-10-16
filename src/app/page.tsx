"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function LandingPage() {
  const { status } = useSession()
  const router = useRouter()

  // Automatically redirect authenticated users to the dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") {
    // Show a loading screen while checking session or redirecting
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-background">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-primary mb-3">LedgerLeaf</h1>
        <p className="text-lg text-muted-foreground">
          Your simple, self-hosted financial ledger.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Start Tracking Today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => signIn("google")}
          >
            Sign up with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/signin")}
          >
            Sign in with Email/Demo
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}