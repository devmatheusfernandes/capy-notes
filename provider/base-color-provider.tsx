"use client"

import * as React from "react"

export const BASE_COLORS = ["stone", "green", "orange", "rose", "violet"] as const
export type BaseColor = (typeof BASE_COLORS)[number]
export const BASE_COLOR_KEY = "capynotes-base-color"

type BaseColorContextType = {
  baseColor: BaseColor
  setBaseColor: (color: BaseColor) => void
}

const BaseColorContext = React.createContext<BaseColorContextType | null>(null)

export function BaseColorProvider({ children }: { children: React.ReactNode }) {
  const [baseColor, setBaseColorState] = React.useState<BaseColor>("stone")
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
    const saved = window.localStorage.getItem(BASE_COLOR_KEY) as BaseColor | null
    if (saved && BASE_COLORS.includes(saved)) {
      setBaseColorState(saved)
      document.documentElement.setAttribute("data-base-color", saved)
    } else {
      // Ensure default is applied
      document.documentElement.setAttribute("data-base-color", "stone")
    }
  }, [])

  const setBaseColor = React.useCallback((color: BaseColor) => {
    setBaseColorState(color)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BASE_COLOR_KEY, color)
      document.documentElement.setAttribute("data-base-color", color)
    }
  }, [])

  return (
    <BaseColorContext.Provider value={{ baseColor, setBaseColor }}>
      {children}
    </BaseColorContext.Provider>
  )
}

export function useBaseColor() {
  const context = React.useContext(BaseColorContext)
  if (!context) {
    throw new Error("useBaseColor must be used within a BaseColorProvider")
  }
  return context
}
