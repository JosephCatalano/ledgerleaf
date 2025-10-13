// src/app/signin/page.tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const [email, setEmail] = useState("demo@ledgerleaf.app")
  const [password, setPassword] = useState("demo")
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    if (!res?.error) router.push("/dashboard")
    else alert("Invalid credentials")
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Continue</Button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              signIn("google", { callbackUrl: "/dashboard" })
            }}
          >
            <Button variant="outline" className="w-full" type="submit">
              Continue with Google
            </Button>
          </form>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setEmail("demo@ledgerleaf.app")
              setPassword("demo")
            }}
          >
            Use demo account
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
