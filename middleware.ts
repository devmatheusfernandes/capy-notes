import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const authCookie = req.cookies.get("auth")?.value
  const isAuthenticated = authCookie === "1" || authCookie === "true"

  if (!isAuthenticated) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.set("redirect", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/hub/:path*"],
}
