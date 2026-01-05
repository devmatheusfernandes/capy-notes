"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Loader2, 
  Palette, 
  ShieldCheck, 
  Save, 
  HardDrive, 
  Settings2, 
  Moon, 
  Sun,
  Laptop,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { useCurrentUserId } from "@/hooks/notes"
import { driveBackupNow } from "@/lib/backup"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { BASE_COLORS, useBaseColor } from "@/provider/base-color-provider"
import { setUserPin, hasUserPin, validateUserPin } from "@/lib/user-settings"
import { toast } from "sonner"
import { StorageTab } from "../../../components/settings/storage-tab"
import { motion } from "framer-motion"

// Componente wrapper para animação de entrada das abas
const TabMotion = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
)

function SettingsContent() {
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const { baseColor, setBaseColor } = useBaseColor()
  const userId = useCurrentUserId()
  
  // Loading States
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Backup States
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupSuccess, setBackupSuccess] = useState(false)

  // PIN States
  const [hasPin, setHasPin] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!userId) return
      setIsLoadingSettings(true)
      try {
        const ref = doc(db, "users", userId, "meta", "settings")
        const snap = await getDoc(ref)
        const data = snap.data() as { lastBackupAt?: string } | undefined
        setLastBackupAt(data?.lastBackupAt ?? null)
        
        // Check PIN
        const pinExists = await hasUserPin(userId)
        setHasPin(pinExists)
      } catch (error) {
        console.error("Erro ao carregar configurações", error)
      } finally {
        setIsLoadingSettings(false)
      }
    }
    load()
  }, [userId])

  const handleDriveBackupClick = async () => {
    setBackupLoading(true)
    setBackupError(null)
    setBackupSuccess(false)
    try {
      if (!userId) throw new Error("Usuário não autenticado")
      const res = await driveBackupNow(userId)
      if (res.success) {
        setLastBackupAt(res.lastBackupAt ?? new Date().toISOString())
        setBackupSuccess(true)
        toast.success("Backup realizado com sucesso!")
      } else {
        setBackupError(res.error ?? "Falha no backup")
      }
    } catch (e) {
      setBackupError((e as Error)?.message || String(e))
    } finally {
      setBackupLoading(false)
    }
  }

  const handleSavePin = async () => {
    if (!userId) return
    if (newPin !== confirmPin) {
      toast.error("Os PINs não coincidem")
      return
    }
    if (newPin.length < 4) {
      toast.error("O PIN deve ter pelo menos 4 dígitos")
      return
    }

    setPinLoading(true)
    try {
      if (hasPin) {
        const isValid = await validateUserPin(userId, currentPin)
        if (!isValid) {
          toast.error("PIN atual incorreto")
          setPinLoading(false)
          return
        }
      }
      
      await setUserPin(userId, newPin)
      setHasPin(true)
      setCurrentPin("")
      setNewPin("")
      setConfirmPin("")
      toast.success("PIN salvo com sucesso")
    } catch (error) {
      toast.error("Erro ao salvar PIN")
    } finally {
      setPinLoading(false)
    }
  }

  if (isLoadingSettings) {
    return (
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências de aparência, segurança e dados.
          </p>
        </div>

        <Tabs defaultValue={searchParams.get("tab") || "aparencia"} className="space-y-6">
          
          {/* Menu de Abas Responsivo */}
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="inline-flex h-auto w-auto gap-2 p-1 bg-transparent">
              <TabsTrigger value="aparencia" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-transparent data-[state=active]:border-border shadow-none">
                <Palette className="mr-2 h-4 w-4" />
                Aparência
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-transparent data-[state=active]:border-border shadow-none">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Segurança
              </TabsTrigger>
              <TabsTrigger value="backup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-transparent data-[state=active]:border-border shadow-none">
                <Save className="mr-2 h-4 w-4" />
                Backup
              </TabsTrigger>
              <TabsTrigger value="armazenamento" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-transparent data-[state=active]:border-border shadow-none">
                <HardDrive className="mr-2 h-4 w-4" />
                Armazenamento
              </TabsTrigger>
              <TabsTrigger value="preferencias" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-transparent data-[state=active]:border-border shadow-none">
                <Settings2 className="mr-2 h-4 w-4" />
                Preferências
              </TabsTrigger>
            </TabsList>
          </div>
          
          <Separator />

          {/* Conteúdo: Aparência */}
          <TabsContent value="aparencia">
            <TabMotion>
              <Card>
                <CardHeader>
                  <CardTitle>Personalização</CardTitle>
                  <CardDescription>Escolha como o aplicativo se parece para você.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tema do Sistema</Label>
                      <Select value={theme ?? "system"} onValueChange={setTheme}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tema" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-4 w-4"/> Claro</div></SelectItem>
                          <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-4 w-4"/> Escuro</div></SelectItem>
                          <SelectItem value="system"><div className="flex items-center gap-2"><Laptop className="h-4 w-4"/> Sistema</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor de Destaque</Label>
                      <Select value={baseColor} onValueChange={(v) => setBaseColor(v as (typeof BASE_COLORS)[number])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a cor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stone">Neutro</SelectItem>
                          <SelectItem value="green">Verde</SelectItem>
                          <SelectItem value="orange">Laranja</SelectItem>
                          <SelectItem value="rose">Rosa</SelectItem>
                          <SelectItem value="violet">Violeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabMotion>
          </TabsContent>

          {/* Conteúdo: Segurança */}
          <TabsContent value="seguranca">
            <TabMotion>
              <Card>
                <CardHeader>
                  <CardTitle>Proteção por PIN</CardTitle>
                  <CardDescription>Adicione uma camada extra de segurança às suas notas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-md">
                  {hasPin && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPin">PIN Atual</Label>
                      <Input
                        id="currentPin"
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        placeholder="••••"
                        className="tracking-widest"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPin">{hasPin ? "Novo PIN" : "Criar PIN"}</Label>
                    <Input
                      id="newPin"
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="••••"
                      className="tracking-widest"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">Confirmar Novo PIN</Label>
                    <Input
                      id="confirmPin"
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="••••"
                      className="tracking-widest"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSavePin} disabled={pinLoading} className="w-full md:w-auto">
                    {pinLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    {hasPin ? "Atualizar PIN" : "Definir PIN"}
                  </Button>
                </CardFooter>
              </Card>
            </TabMotion>
          </TabsContent>

          {/* Conteúdo: Armazenamento */}
          <TabsContent value="armazenamento">
            <TabMotion>
              <StorageTab />
            </TabMotion>
          </TabsContent>

          {/* Conteúdo: Preferências */}
          <TabsContent value="preferencias">
            <TabMotion>
              <Card>
                <CardHeader>
                  <CardTitle>Preferências Gerais</CardTitle>
                  <CardDescription>Ajuste o comportamento padrão do aplicativo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground flex items-center justify-center py-8">
                    Mais opções serão adicionadas em breve.
                  </div>
                </CardContent>
              </Card>
            </TabMotion>
          </TabsContent>

          {/* Conteúdo: Backup */}
          <TabsContent value="backup">
            <TabMotion>
              <Card>
                <CardHeader>
                  <CardTitle>Backup & Restauração</CardTitle>
                  <CardDescription>Mantenha seus dados seguros na nuvem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Último backup realizado</p>
                        <p className="text-muted-foreground text-xs">
                          {lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "Nenhum backup encontrado"}
                        </p>
                      </div>
                      <Button onClick={handleDriveBackupClick} disabled={backupLoading || !userId}>
                         {backupLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Fazer Backup Agora
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {backupSuccess && (
                    <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Sucesso</AlertTitle>
                      <AlertDescription>Seus dados foram salvos no Google Drive com segurança.</AlertDescription>
                    </Alert>
                  )}

                  {backupError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erro no Backup</AlertTitle>
                      <AlertDescription>{backupError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabMotion>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
