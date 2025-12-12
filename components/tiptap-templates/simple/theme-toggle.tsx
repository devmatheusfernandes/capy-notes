"use client"

import { Button } from "@/components/tiptap-ui-primitive/button"
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon"
import { SunIcon } from "@/components/tiptap-icons/sun-icon"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === "dark"

  const toggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button onClick={toggle} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`} data-style="ghost">
      {isDark ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  )
}
