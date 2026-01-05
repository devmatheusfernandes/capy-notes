"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { 
  RefreshCw, 
  ImageIcon, 
  Database, 
  HardDrive, 
  File
} from "lucide-react"
import { useCurrentUserId } from "@/hooks/notes"
import { toast } from "sonner"
import { getStorageUsage, STORAGE_LIMITS } from "@/lib/storage-limits"
import { motion } from "framer-motion"

// --- Funções Auxiliares ---

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// --- Sub-componente de Card (Simplificação) ---

interface StorageItemProps {
  label: string
  icon: React.ElementType
  usage: number
  limit: number
  colorClass: string
  loading: boolean
  delay?: number
}

function StorageCard({ label, icon: Icon, usage, limit, colorClass, loading, delay = 0 }: StorageItemProps) {
  const percent = Math.min((usage / limit) * 100, 100)

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                <Icon className={`h-5 w-5 ${colorClass}`} />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">{label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatBytes(usage)} <span className="opacity-50">/ {formatBytes(limit)}</span>
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold ${colorClass}`}>
              {percent.toFixed(1)}%
            </span>
          </div>

          <div className="relative w-full overflow-hidden rounded-full bg-primary/20 h-2">
             <motion.div
              className={`h-full text-primary bg-primary`}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: delay + 0.2 }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// --- Componente Principal ---

export function StorageTab() {
  const userId = useCurrentUserId()
  const [loading, setLoading] = useState(true) // Começa true para mostrar skeleton na carga inicial
  const [isRefetching, setIsRefetching] = useState(false)
  const [usageData, setUsageData] = useState({
    pdf: 0,
    img: 0,
    backup: 0
  })

  const fetchUsage = async (showSkeleton = true) => {
    if (!userId) return
    
    if (showSkeleton) setLoading(true)
    else setIsRefetching(true)

    try {
      const [img, pdf, backup] = await Promise.all([
        getStorageUsage(userId, "image"),
        getStorageUsage(userId, "pdf"),
        getStorageUsage(userId, "backup"),
      ])
      
      setUsageData({ img, pdf, backup })
    } catch (error) {
      console.error("Erro ao calcular armazenamento:", error)
      toast.error("Erro ao calcular uso do armazenamento")
    } finally {
      setLoading(false)
      setIsRefetching(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [userId])

  const handleRefresh = () => fetchUsage(false)

  // Cálculo do total global (opcional, para visualização rápida)
  const totalUsed = usageData.pdf + usageData.img + usageData.backup
  const totalLimit = STORAGE_LIMITS.pdf + STORAGE_LIMITS.image + STORAGE_LIMITS.backup // Aproximado

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full hidden sm:block">
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Gerenciamento de Espaço</h2>
            <p className="text-sm text-muted-foreground">
              Visão geral do consumo de dados da sua conta.
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={loading || isRefetching}
          className=""
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || isRefetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StorageCard
          label="Documentos PDF"
          icon={File}
          usage={usageData.pdf}
          limit={STORAGE_LIMITS.pdf}
          colorClass="text-background-secondary"
          loading={loading}
          delay={0.1}
        />
        <StorageCard
          label="Imagens nas Notas"
          icon={ImageIcon}
          usage={usageData.img}
          limit={STORAGE_LIMITS.image}
          colorClass="text-background-secondary"
          loading={loading}
          delay={0.2}
        />
        <StorageCard
          label="Backups JW Library"
          icon={Database}
          usage={usageData.backup}
          limit={STORAGE_LIMITS.backup}
          colorClass="text-background-secondary"
          loading={loading}
          delay={0.3}
        />
      </div>
      
      {/* Footer / Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground flex gap-3"
      >
        <div className="shrink-0 mt-0.5">
          <HardDrive className="h-4 w-4" />
        </div>
        <p>
          O armazenamento é calculado individualmente por categoria. 
          Se você atingir o limite de uma categoria (como PDFs), 
          o envio desse tipo específico de arquivo será pausado até que você libere espaço.
        </p>
      </motion.div>
    </div>
  )
}