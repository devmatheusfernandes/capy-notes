"use client"

import Link from "next/link"
import Image from "next/image"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { hubNav } from "./nav-items"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator" // Importante para o visual
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Command, 
  User2,
  LogOut,
  Save,
  Share2,
  MoreVertical
} from "lucide-react"

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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import FolderBreadcrumbs from "@/components/notes/folder-breadcrumbs"
import CreateFolderDialog from "@/components/notes/create-folder-dialog"
import { useCreateNote, useCurrentUserId, useFolders } from "@/hooks/notes"
import { getFolderPath, createFolder } from "@/lib/folders"
import { LayoutGrid, List as ListIcon, FileText } from "lucide-react"
import CapyIcon from '../../public/images/capy-images/capy-icon.png'

export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Lógica de verificação de rota para o Layout (se esconde a sidebar ou não)
  const isNoteEditor = /^\/hub\/notes\/[^\/]+$/.test(pathname || "")
  
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
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild>
                    <Link href="/hub">
                        <Image className="flex aspect-square size-8 items-center justify-center rounded-lg" src={CapyIcon} alt="Logo" width={32} height={32} priority />
                      
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">CapyNotes</span>
                        <span className="truncate text-xs">Hub</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>

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
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
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
                          <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
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
                                    <SidebarMenuSubButton asChild isActive={pathname === child.href}>
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

            <SidebarFooter>
              <SidebarMenu>
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
                <SidebarMenuItem>
                  <div className="flex items-center gap-2 mt-2 px-1">
                     <div className="shrink-0">
                        <ModeToggle />
                     </div>
                     <Button 
                        variant="outline" 
                        className="flex-1 justify-start gap-2 h-9 border-sidebar-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors overflow-hidden group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                        onClick={() => console.log("Logout clicked")}
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
          <div className="flex-1 overflow-y-auto">{children}</div>
        ) : (
          <SidebarInset className="flex flex-col h-full overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background z-10 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              
              {/* AQUI ESTÁ A MÁGICA: O HeaderContent dinâmico */}
              <div className="flex flex-1 items-center justify-between">
                <Suspense fallback={<div className="h-8 w-20 bg-muted animate-pulse rounded" />}>
                   <HeaderContent pathname={pathname} />
                </Suspense>
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

// --- COMPONENTE CONTROLADOR DO HEADER ---
function HeaderContent({ pathname }: { pathname: string | null }) {
  // 1. Lógica para a Bíblia
  if (pathname?.startsWith("/hub/spiritual/bible")) {
    return <BibleHeader pathname={pathname} />
  }

  // 2. Lógica para Estudo Pessoal (Exemplo)
  if (pathname?.startsWith("/hub/spiritual/personal-study")) {
    return (
      <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-left-2">
        <span className="font-semibold text-sm">Estudo Pessoal</span>
      </div>
    )
  }

  // 3. Header para Notas (lista)
  if (pathname === "/hub/notes") {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { create } = useCreateNote()
    const userId = useCurrentUserId()
    const { folders } = useFolders()
    const [viewPref, setViewPref] = useState<"list" | "grid">("list")

    useEffect(() => {
      const stored = typeof window !== "undefined" ? localStorage.getItem("notes_view") : null
      if (stored === "grid" || stored === "list") setViewPref(stored)
    }, [])

    const folderId = searchParams?.get("folder") || undefined
    const folderPath = useMemo(() => getFolderPath(folders, folderId || ""), [folders, folderId])

    const toggleView = () => {
      const next = viewPref === "list" ? "grid" : "list"
      setViewPref(next)
      try {
        localStorage.setItem("notes_view", next)
        const ev = new CustomEvent("capynotes_view_changed", { detail: next })
        window.dispatchEvent(ev)
      } catch {}
    }

    const handleNavigateFolder = (fid?: string) => {
      const q = new URLSearchParams(searchParams?.toString())
      if (fid) {
        q.set("folder", fid)
      } else {
        q.delete("folder")
      }
      const next = q.toString() ? `/hub/notes?${q.toString()}` : `/hub/notes`
      router.push(next)
    }

    const handleCreateNote = async () => {
      const note = await create({ folderId })
      router.push(`/hub/notes/${note.id}`)
    }

    const handleCreateFolder = async (name: string) => {
      const fid = searchParams?.get("folder") || undefined
      if (!userId) return
      await createFolder(userId, name, fid)
    }

    return (
      <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-left-2">
        <div className="flex items-center min-w-0">
          <FolderBreadcrumbs
            path={folderPath.map((f) => ({ id: f.id, name: f.name }))}
            onNavigate={handleNavigateFolder}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={handleCreateNote} aria-label="Criar nota">
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nota</span>
          </Button>
          <CreateFolderDialog onCreate={handleCreateFolder} />
          <Button variant="ghost" size="icon" onClick={toggleView}>
            {viewPref === "list" ? <LayoutGrid size={20} /> : <ListIcon size={20} />}
          </Button>
        </div>
      </div>
    )
  }

  // 4. Padrão (Breadcrumbs simples)
  // Pega o último segmento da URL e formata
  const title = pathname?.split("/").pop()?.replace(/-/g, " ") || "Início"
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize animate-in fade-in">
        <span>Início</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{title}</span>
    </div>
  )
}

// --- COMPONENTE DA BÍBLIA ---
function BibleHeader({ pathname }: { pathname: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookParam = searchParams?.get("book") || ""
  const chapterParam = searchParams?.get("chapter") || ""
  const bibleView = chapterParam ? "reader" : bookParam ? "chapters" : "books"

  return (
    <div className="flex items-center justify-between w-full animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-2">
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
                className="flex items-center gap-1 text-foreground px-2 h-8"
                >
                <ChevronLeft className="w-4 h-4" />
                <span className="font-medium">{bibleView === "chapters" ? "Voltar ao Sumário" : bookParam}</span>
                </Button>
            )}
            {bibleView === "books" && <span className="font-semibold text-sm ml-2">Leitura da Bíblia</span>}
        </div>

        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
        >
            <Search className="w-4 h-4" />
        </Button>
    </div>
  )
}
