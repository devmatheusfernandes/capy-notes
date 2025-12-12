"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { Button } from "@/components/ui/button"
import { PanelRightClose } from "lucide-react"
import * as React from "react"

type UniversalSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  desktopWidth?: number | string 
  title?: string
}

export default function UniversalSidebar({ 
  open, 
  onOpenChange, 
  children, 
  // Valor padrão pode ser mantido ou alterado, mas será sobrescrito no uso
  desktopWidth = "10%", 
  title = "Painel" 
}: UniversalSidebarProps) {
  const isMobile = useIsBreakpoint()

  if (isMobile) {
    return (
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="mobile-sidebar"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-background"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-medium">{title}</div>
              <Button variant="ghost" size="icon" aria-label="Fechar painel" onClick={() => onOpenChange(false)}>
                <PanelRightClose className="size-4" />
              </Button>
            </div>
            <div className="h-[calc(100vh-48px)] overflow-auto">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        key="desktop-sidebar"
        initial={{ width: 0, opacity: 0 }}
        // Framer motion aceita strings de porcentagem nativamente
        animate={{ width: open ? desktopWidth : 0, opacity: open ? 1 : 0 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="border-l bg-background overflow-hidden sticky top-0"
        style={{ height: "100vh" }}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b px-4 py-1">
          <div className="text-sm font-medium">{title}</div>
          <Button variant="ghost" size="icon" aria-label="Fechar painel" onClick={() => onOpenChange(false)}>
            <PanelRightClose className="size-4" />
          </Button>
        </div>
        <div className="h-[calc(100vh-48px)] overflow-auto">{children}</div>
      </motion.aside>
    </AnimatePresence>
  )
}