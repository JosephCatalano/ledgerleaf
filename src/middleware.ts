// src/middleware.ts
import { auth } from "next-auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Protect /dashboard (and later any /app routes)
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    const url = new URL("/signin", req.nextUrl.origin)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
})

// Only run on selected paths
export { auth as middleware } from "@/lib/auth"

