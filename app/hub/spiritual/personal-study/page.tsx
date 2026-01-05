"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { BookOpen, Database, ArrowRight, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton" // Certifique-se de ter este componente
import Capybaraship from "../../../../public/images/capy-images/morning-capybaraship.png"
import Bacapybara from "../../../../public/images/capy-images/bacapybara.png"

// --- Dados ---
const resources = [
  {
    title: "Vídeos",
    description: "Assista aos vídeos do JW Broadcasting e crie notas.",
    href: "/hub/spiritual/personal-study/latest-videos",
    image: Capybaraship,
    icon: BookOpen,
    color: "bg-blue-500", // Simplifiquei para usar opacity no componente
    iconColor: "text-blue-600",
  },
  {
    title: "Backup do Aplicativo",
    description: "Gerencie, visualize ou restaure os backups da sua biblioteca pessoal.",
    href: "/hub/spiritual/personal-study/library-backup",
    image: Bacapybara,
    icon: Database,
    color: "bg-emerald-500",
    iconColor: "text-emerald-600",
  },
]

// --- Variáveis de Animação ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50 } }
}

// --- Componente Skeleton (Loading) ---
function ResourceCardSkeleton() {
  return (
    <div className="h-full rounded-2xl border bg-card overflow-hidden">
      <div className="h-40 w-full bg-muted animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  )
}

export default function NotesPage() {
  // Simulação de loading para demonstrar o Skeleton
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      
      {/* Cabeçalho com Animação */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 border-b pb-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Estudo Pessoal
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Recursos espirituais, vídeos e ferramentas para aprofundar seu conhecimento.
        </p>
      </motion.div>

      {/* Grid de Recursos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {resources.map((item) => (
            <motion.div key={item.href} variants={itemVariants}>
              <Link 
                href={item.href} 
                className="group block h-full focus:outline-none"
              >
                <div className="h-full flex flex-col rounded-2xl border bg-card text-card-foreground overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 relative">
                  
                  {/* Área da Imagem */}
                  <div className="relative w-full h-48 overflow-hidden bg-muted">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      priority
                    />
                    
                    {/* Badge/Ícone Flutuante Glassmorphism */}
                    <div className="absolute top-4 right-4 z-20">
                      <div className="p-2.5 rounded-xl backdrop-blur-md bg-white/90 dark:bg-black/60 shadow-sm border border-white/20">
                        <item.icon size={20} className={item.iconColor} />
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="flex flex-col flex-grow p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Botão Adicionar (Placeholder) */}
          <motion.div variants={itemVariants}>
            <button className="w-full h-full min-h-[280px] rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-muted-foreground gap-4 group cursor-pointer">
              <div className="p-4 rounded-full bg-muted group-hover:bg-background shadow-sm transition-all duration-300 group-hover:scale-110">
                <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="font-medium group-hover:text-primary transition-colors">Adicionar Atalho</span>
            </button>
          </motion.div>

        </motion.div>
      )}
    </div>
  )
}