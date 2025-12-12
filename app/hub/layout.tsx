"use client"

import Link from "next/link"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { hubNav } from "./nav-items"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Command, 
  User2,
  LogOut 
} from "lucide-react" // Adicionei LogOut aqui

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
  // SidebarInput, // Removido conforme solicitado
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
  SidebarRail,
  useSidebar,
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

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  return (
    <SidebarProvider>
      <div className="flex no-scrollbar w-full h-screen overflow-hidden">
        {!isNoteEditor && (
          <Sidebar variant="inset" collapsible="icon">
            {/* --- HEADER DA SIDEBAR --- */}
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild>
                    <Link href="/hub">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Command className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">Spiritual Hub</span>
                        <span className="truncate text-xs">Personal Study</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {/* Input de pesquisa removido aqui */}
            </SidebarHeader>

            {/* --- CONTEÚDO DA SIDEBAR --- */}
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navegação</SidebarGroupLabel>
                <SidebarMenu>
                  {hubNav.map((item) => {
                    const hasChildren = !!item.children?.length
                    const isActive = item.href 
                      ? pathname === item.href 
                      : !!item.children?.some((c) => pathname === c.href)
                    const isOpen = openGroups[item.title]

                    if (!hasChildren && item.href) {
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                            tooltip={item.title}
                          >
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
                          tooltip={item.title}
                          onClick={() => toggleGroup(item.title)}
                          className="group/menu-button"
                        >
                          <item.icon />
                          <span className="font-medium">{item.title}</span>
                          <ChevronRight 
                            className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                              isOpen ? "rotate-90" : ""
                            }`} 
                          />
                        </SidebarMenuButton>
                        
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key={item.title}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <SidebarMenuSub>
                                {item.children?.map((child) => (
                                  <SidebarMenuSubItem key={child.href}>
                                    <SidebarMenuSubButton 
                                      asChild 
                                      isActive={pathname === child.href}
                                    >
                                      <Link href={child.href!}>
                                        {child.icon && <child.icon className="h-4 w-4 mr-2 opacity-70" />}
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

            {/* --- FOOTER DA SIDEBAR (MODIFICADO) --- */}
            <SidebarFooter>
              <SidebarMenu>
                {/* Perfil do Usuário */}
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-sidebar-foreground">
                        <User2 className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Minha Conta</span>
                      <span className="truncate text-xs text-muted-foreground">usuario@exemplo.com</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Ações: Tema e Logout */}
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 mt-2 px-1">
                     {/* Theme Toggle (Adaptado para layout flex) */}
                     <div className="shrink-0">
                        <ModeToggle />
                     </div>
                     
                     {/* Botão de Logout */}
                     <Button 
                        variant="outline" 
                        className="flex-1 justify-start gap-2 h-9 border-sidebar-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors overflow-hidden group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                        onClick={() => {
                            // Adicione sua lógica de logout aqui
                            console.log("Logout clicked")
                        }}
                     >
                        <LogOut className="size-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden truncate">Sair</span>
                     </Button>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            
            <SidebarRail />
          </Sidebar>
        )}

        {/* --- ÁREA PRINCIPAL --- */}
        {isNoteEditor ? (
          <div className="flex-1 overflow-hidden">{children}</div>
        ) : (
          <SidebarInset className="flex flex-col h-full overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background z-10 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <SidebarTrigger className="-ml-1" />
              <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBible && (
                    <Suspense fallback={null}>
                      <BibleHeader pathname={pathname} />
                    </Suspense>
                  )}
                </div>
                {/* ModeToggle removido daqui (movido para sidebar) */}
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
               {children}
            </div>
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
          size="sm"
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
          className="flex items-center gap-1 text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-medium">{bibleView === "chapters" ? "Voltar ao Sumário" : bookParam}</span>
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
        className="text-foreground/80 hover:text-foreground"
      >
        <Search className="w-4 h-4" />
      </Button>
    </>
  )
}