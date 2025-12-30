"use client";

import Link from "next/link";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { hubNav } from "./nav-items";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"; // Importante para o visual
import {
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Upload,
  BookOpenText,
  ChevronsUpDown,
  Sparkles,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
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
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import FolderBreadcrumbs from "@/components/notes/folder-breadcrumbs";
import CreateFolderDialog from "@/components/notes/create-folder-dialog";
import { useCreateNote, useCurrentUserId, useFolders } from "@/hooks/notes";
import { getFolderPath, createFolder } from "@/lib/folders";
import { textToTiptapContent } from "@/lib/utils";
import { handlePdfUpload } from "@/lib/tiptap-utils";
import { LayoutGrid, List as ListIcon, FileText } from "lucide-react";
import CapyIcon from "../../public/images/capy-images/capy-icon.png";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ButtonGroup } from "@/components/ui/button-group";

const MOCK_AVATARS = [
  "/images/mock-profile-picture/rick.jpg",
  "/images/mock-profile-picture/morty.jpg",
];

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { setTheme } = useTheme();

  const avatarIndex = useMemo(() => {
    if (!user?.uid) return 0;
    let hash = 0;
    for (let i = 0; i < user.uid.length; i++) {
      hash = user.uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % MOCK_AVATARS.length;
  }, [user?.uid]);

  // Google Default Picture often contains "default-user" or specific patterns.
  // Since distinguishing "Letter Avatar" from "Custom Avatar" by URL is tricky,
  // we check for known default patterns.
  const isDefaultGoogleAvatar = useMemo(() => {
    if (!user?.photoURL) return false;
    return user.photoURL.includes("default-user");
  }, [user?.photoURL]);

  const avatarSrc = (user?.photoURL && !isDefaultGoogleAvatar) ? user.photoURL : MOCK_AVATARS[avatarIndex];

  // Lógica de verificação de rota para o Layout (se esconde a sidebar ou não)
  const isNoteEditor = /^\/hub\/notes\/[^\/]+$/.test(pathname || "");

  const initialOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    hubNav.forEach((i) => {
      if (i.children?.some((c) => c.href === pathname)) map[i.title] = true;
    });
    return map;
  }, [pathname]);

  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (!u) {
        router.push("/")
      }
    })
    return () => unsub()
  }, [router])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return null
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
                      <Image
                        className="flex aspect-square size-12 items-center justify-center rounded-lg"
                        src={CapyIcon}
                        alt="Logo"
                        width={32}
                        height={32}
                        priority
                      />

                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          CapyNotes
                        </span>
                        <span className="truncate text-xs">Seu dashboard</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {hubNav.map((item) => {
                    const hasChildren = !!item.children?.length;
                    const isActive = item.href
                      ? pathname === item.href
                      : !!item.children?.some((c) => pathname === c.href);
                    const isOpen = openGroups[item.title];

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
                      );
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
                                        {child.icon && (
                                          <child.icon className="h-4 w-4 mr-2 opacity-70" />
                                        )}
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
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      >
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-sidebar-foreground overflow-hidden">
                          <Image
                            src={avatarSrc}
                            alt={user?.displayName || "Avatar"}
                            width={32}
                            height={32}
                            className="rounded-lg h-full w-full object-cover"
                          />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                          <span className="truncate font-semibold">
                            {user?.displayName || "Minha Conta"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user?.email || "usuario@exemplo.com"}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                      side="bottom"
                      align="end"
                      sideOffset={4}
                    >
                      <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-sidebar-foreground overflow-hidden">
                            <Image
                              src={avatarSrc}
                              alt={user?.displayName || "Avatar"}
                              width={32}
                              height={32}
                              className="rounded-lg h-full w-full object-cover"
                            />
                          </div>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                              {user?.displayName || "Minha Conta"}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {user?.email || "usuario@exemplo.com"}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Sparkles className="mr-2 size-4" />
                            Tema
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                              <Sun className="mr-2 size-4" />
                              Claro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                              <Moon className="mr-2 size-4" />
                              Escuro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")}>
                              <Laptop className="mr-2 size-4" />
                              Sistema
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          setIsLoggingOut(true);
                          await signOut(auth);
                          router.push("/");
                        }}
                      >
                        <LogOut className="mr-2 size-4" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                <Suspense
                  fallback={
                    <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  }
                >
                  <HeaderContent pathname={pathname} />
                </Suspense>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {children}
            </div>
            <Toaster />
          </SidebarInset>
        )}

        {isLoggingOut && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Spinner className="h-10 w-10 text-primary mb-4" />
            <span className="text-lg font-medium text-foreground">Saindo...</span>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}

// --- COMPONENTE CONTROLADOR DO HEADER ---
function HeaderContent({ pathname }: { pathname: string | null }) {
  // 1. Lógica para a Bíblia
  if (pathname?.startsWith("/hub/spiritual/bible")) {
    return <BibleHeader pathname={pathname} />;
  }

  // 2. Lógica para Estudo Pessoal (Exemplo)
  if (pathname?.startsWith("/hub/spiritual/personal-study")) {
    return (
      <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-left-2">
        <span className="font-semibold text-sm">Estudo Pessoal</span>
      </div>
    );
  }

  // 3. Header para Notas (lista)
  if (pathname === "/hub/notes") {
    return <NotesHeader />;
  }

  // 4. Padrão (Breadcrumbs simples)
  // Pega o último segmento da URL e formata
  const title = pathname?.split("/").pop()?.replace(/-/g, " ") || "Início";

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize animate-in fade-in">
      <span>Início</span>
      <ChevronRight className="w-4 h-4" />
      <span className="text-foreground font-medium">{title}</span>
    </div>
  );
}

function NotesHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create } = useCreateNote();
  const userId = useCurrentUserId();
  const { folders } = useFolders();
  const [viewPref, setViewPref] = useState<"list" | "grid">("list");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("notes_view") : null;
    if (stored === "grid" || stored === "list") setViewPref(stored);
  }, []);

  const folderId = searchParams?.get("folder") || undefined;
  const folderPath = useMemo(
    () => getFolderPath(folders, folderId || ""),
    [folders, folderId]
  );

  const toggleView = () => {
    const next = viewPref === "list" ? "grid" : "list";
    setViewPref(next);
    try {
      localStorage.setItem("notes_view", next);
      const ev = new CustomEvent("capynotes_view_changed", { detail: next });
      window.dispatchEvent(ev);
    } catch {}
  };

  const handleNavigateFolder = (fid?: string) => {
    const q = new URLSearchParams(searchParams?.toString());
    if (fid) {
      q.set("folder", fid);
    } else {
      q.delete("folder");
    }
    const next = q.toString() ? `/hub/notes?${q.toString()}` : `/hub/notes`;
    router.push(next);
  };

  const handleCreateNote = async () => {
    const note = await create({ folderId });
    router.push(`/hub/notes/${note.id}`);
  };

  const handleCreateFolder = async (name: string) => {
    const fid = searchParams?.get("folder") || undefined;
    if (!userId) return;
    await createFolder(userId, name, fid);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let importedCount = 0;
    const toastId = toast.loading("Importando arquivos...");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type === "application/pdf") {
          try {
            const url = await handlePdfUpload(file);
            const content = {
              type: "doc",
              content: [
                {
                  type: "pdf",
                  attrs: {
                    src: url,
                    title: file.name,
                  },
                },
              ],
            };
            // @ts-ignore
            await create({
              title: file.name.replace(".pdf", ""),
              content,
              folderId,
              type: "pdf",
              fileUrl: url,
            });
            importedCount++;
          } catch (error) {
            console.error("Error uploading PDF:", error);
            toast.error(`Erro ao importar ${file.name}`);
          }
        } else if (
          file.name.toLowerCase().endsWith(".txt") ||
          file.name.toLowerCase().endsWith(".md")
        ) {
          const text = await file.text();
          const title = file.name.replace(/\.(txt|md)$/i, "");
          const content = textToTiptapContent(text);
          await create({ title, content, folderId });
          importedCount++;
        }
      }
    } catch (error) {
      console.error("Error importing files:", error);
    } finally {
      toast.dismiss(toastId);
      if (importedCount > 0) {
        toast.success(`${importedCount} nota(s) importada(s) com sucesso!`);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-left-2">
      <div className="flex items-center min-w-0">
        <FolderBreadcrumbs
          path={folderPath.map((f) => ({ id: f.id, name: f.name }))}
          onNavigate={handleNavigateFolder}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".txt,.md,.pdf"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleImportClick}
          title="Importar notas (.txt, .md, .pdf)"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleCreateNote}
          aria-label="Criar nota"
        >
          <FileText className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nota</span>
        </Button>
        <CreateFolderDialog onCreate={handleCreateFolder} />
        <Button variant="ghost" size="icon" onClick={toggleView}>
          {viewPref === "list" ? (
            <LayoutGrid size={20} />
          ) : (
            <ListIcon size={20} />
          )}
        </Button>
      </div>
    </div>
  );
}

// --- COMPONENTE DA BÍBLIA ---
function BibleHeader({ pathname }: { pathname: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookParam = searchParams?.get("book") || "";
  const chapterParam = searchParams?.get("chapter") || "";
  const bibleView = chapterParam ? "reader" : bookParam ? "chapters" : "books";
  
  const versionParam = searchParams?.get("version") || "nwt-pt";
  const [versions, setVersions] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetch("/api/bible?get=versions")
      .then(res => res.json())
      .then(data => {
        if (data.versions) setVersions(data.versions);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="relative flex items-center justify-between w-full animate-in fade-in zoom-in-95">
      <div className="flex items-center gap-2">
        {bibleView !== "books" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const q = new URLSearchParams(searchParams?.toString());
              if (bibleView === "reader") {
                q.delete("chapter");
              } else {
                q.delete("book");
                q.delete("chapter");
              }
              const next = q.toString()
                ? `${pathname}?${q.toString()}`
                : pathname!;
              router.push(next, { scroll: false });
            }}
            className="flex items-center gap-1 text-foreground px-2 h-8"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium">
              {bibleView === "chapters" ? (
                <>
                  <span className="hidden sm:inline">Voltar ao Sumário</span>
                  <span className="sm:hidden">Voltar</span>
                </>
              ) : (
                bookParam
              )}
            </span>
          </Button>
        )}
        {bibleView === "books" && (
          <span className="font-semibold text-sm ml-2">Leitura da Bíblia</span>
        )}
      </div>

      <div className="md:absolute md:left-1/2 md:-translate-x-1/2 max-w-[140px] md:max-w-none">
        <Select 
          value={versionParam} 
          onValueChange={(val) => {
            const q = new URLSearchParams(searchParams?.toString());
            q.set("version", val);
            router.push(`${pathname}?${q.toString()}`, { scroll: false });
          }}
        >
          <SelectTrigger className="min-w-full h-8 bg-transparent border-transparent hover:bg-muted/50 focus:ring-0 gap-2 font-semibold text-sm justify-center">
            <SelectValue placeholder="Selecione a versão" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <ButtonGroup>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          const q = new URLSearchParams(searchParams?.toString());
          if (q.get("search") === "1") {
            q.delete("search");
          } else {
            q.set("search", "1");
          }
          const next = q.toString() ? `${pathname}?${q.toString()}` : pathname!;
          router.push(next, { scroll: false });
        }}
      >
        <Search className="w-4 h-4" />
      </Button>

      {bibleView === "reader" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const q = new URLSearchParams(searchParams?.toString());
            if (q.get("showReferences") === "1") {
              q.delete("showReferences");
            } else {
              q.set("showReferences", "1");
              // Clear specific verse selection when toggling mainly
              q.delete("refVerse");
            }
            const next = q.toString() ? `${pathname}?${q.toString()}` : pathname!;
            router.push(next, { scroll: false });
          }}
          title="Referências Cruzadas"
        >
          <BookOpenText className="w-4 h-4" />
        </Button>
      )}
      </ButtonGroup>
    </div>
  );
}
