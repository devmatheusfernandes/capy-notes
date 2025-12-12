"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

const BASE_COLOR_KEY = "capynotes-base-color"
const BASE_COLORS = ["stone", "green", "orange", "rose", "violet"] as const

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(BASE_COLOR_KEY) : null
    const initial = saved && (BASE_COLORS as readonly string[]).includes(saved) ? saved : "stone"
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-base-color", initial)
    }
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
