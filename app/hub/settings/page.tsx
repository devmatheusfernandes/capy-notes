"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

const BASE_COLOR_KEY = "capynotes-base-color"
const BASE_COLORS = ["stone", "green", "orange", "rose", "violet"] as const

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [baseColor, setBaseColor] = useState<(typeof BASE_COLORS)[number]>("stone")

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(BASE_COLOR_KEY) as (typeof BASE_COLORS)[number] | null) : null
    const initial = saved && BASE_COLORS.includes(saved) ? saved : "stone"
    setBaseColor(initial)
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-base-color", initial)
    }
  }, [])

  const handleBaseColorChange = (value: (typeof BASE_COLORS)[number]) => {
    setBaseColor(value)
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-base-color", value)
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(BASE_COLOR_KEY, value)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">Configurações</h1>
      <p className="text-sm text-muted-foreground">Ajuste as opções do aplicativo.</p>

      <Tabs defaultValue="aparencia">
        <TabsList>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="aparencia">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Tema</h2>
              <p className="text-sm text-muted-foreground">Selecione o modo: claro, escuro ou sistema.</p>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecione o tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Cor base</h2>
              <p className="text-sm text-muted-foreground">Troque a paleta principal: stone, green, orange, rose, violet.</p>
              <Select value={baseColor} onValueChange={(v) => handleBaseColorChange(v as (typeof BASE_COLORS)[number])}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Selecione a cor base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stone">Stone (padrão)</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferencias">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Preferências</h2>
            <p className="text-sm text-muted-foreground">Opções de comportamento e atalhos.</p>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Backup</h2>
            <p className="text-sm text-muted-foreground">Exportar e restaurar dados.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
