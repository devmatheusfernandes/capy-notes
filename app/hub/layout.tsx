"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { hubNav } from "./nav-items"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
 

export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isNoteEditor = /^\/hub\/notes\/[^/]+$/.test(pathname || "")
  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {}
    hubNav.forEach((i) => {
      if (i.children?.some((c) => c.href === pathname)) map[i.title] = true
    })
    return map
  }, [pathname])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen)
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        {!isNoteEditor && (
          <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <SidebarInput placeholder="Pesquisar" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarMenu>
                {hubNav.map((item) => {
                  const hasChildren = !!item.children?.length
                  const isActive = item.href ? pathname === item.href : !!item.children?.some((c) => pathname === c.href)
                  if (!hasChildren && item.href) {
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        data-state={openGroups[item.title] ? "open" : "closed"}
                        aria-expanded={openGroups[item.title] ? "true" : "false"}
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [item.title]: !prev[item.title],
                          }))
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        aria-label="Alternar submenu"
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [item.title]: !prev[item.title],
                          }))
                        }
                      />
                      <AnimatePresence initial={false}>
                        {openGroups[item.title] && (
                          <motion.div
                            key={item.title}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            <SidebarMenuSub>
                              {item.children?.map((child) => (
                                <SidebarMenuSubItem key={child.href}>
                                  <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                                    <Link href={child.href!}>
                                      <child.icon />
                                      <span>{child.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        )}

        {isNoteEditor ? (
          <div className="flex-1">{children}</div>
        ) : (
          <SidebarInset>
            <header className="flex h-12 items-center gap-2 border-b px-2 md:px-4">
              <SidebarTrigger />
              <Link href="/" className="text-sm font-medium">
                CapyNotes
              </Link>
              <div className="ml-auto">
                <ModeToggle />
              </div>
            </header>
            <div className="p-4">{children}</div>
          </SidebarInset>
        )}
      </div>
    </SidebarProvider>
  )
}
