"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { hubNav } from "./nav-items"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { ChevronLeft } from "lucide-react"
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
import { Toaster } from "@/components/ui/sonner"
 

export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isNoteEditor = /^\/hub\/notes\/[^\/]+$/.test(pathname || "")
  const isBible = pathname?.startsWith("/hub/spiritual/bible")
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
      <div className="flex no-scrollbar w-full">
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
          <SidebarInset className="max-h-[97vh] overflow-y-auto no-scrollbar">
            <header className="flex h-14 items-center gap-2 border-b px-2 md:px-4 py-2 sticky top-0 bg-background z-10">
              <SidebarTrigger />
              <div className="ml-auto flex items-center gap-2">
                {isBible && (
                  <Suspense fallback={null}>
                    <BibleHeader pathname={pathname} />
                  </Suspense>
                )}
                <ModeToggle />
              </div>
            </header>
            <div className="p-2">{children}</div>
            <Toaster />
          </SidebarInset>
        )}
      </div>
    </SidebarProvider>
  )
}

function BibleHeader({ pathname }: { pathname: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookParam = searchParams?.get("book") || ""
  const chapterParam = searchParams?.get("chapter") || ""
  const bibleView = chapterParam ? "reader" : bookParam ? "chapters" : "books"

  return (
    <>
      {bibleView !== "books" && (
        <Button
          variant="ghost"
          onClick={() => {
            const q = new URLSearchParams(searchParams?.toString())
            if (bibleView === "reader") {
              q.delete("chapter")
            } else {
              q.delete("book")
              q.delete("chapter")
            }
            const next = q.toString() ? `${pathname}?${q.toString()}` : pathname!
            router.push(next, { scroll: false })
          }}
          className="flex items-center text-foreground hover:bg-secondary-foreground px-2 py-1 rounded transition-colors text-sm sm:text-base font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          {bibleView === "chapters" ? "Sumário" : bookParam}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const q = new URLSearchParams(searchParams?.toString())
          if (q.get("search") === "1") {
            q.delete("search")
          } else {
            q.set("search", "1")
          }
          const next = q.toString() ? `${pathname}?${q.toString()}` : pathname!
          router.push(next, { scroll: false })
        }}
        className="text-foreground hover:bg-secondary-foreground"
      >
        <Search className="w-5 h-5" />
      </Button>
    </>
  )
}
