"use client"

import Link from "next/link"
import Image from "next/image"
import { BookOpen, Database, ArrowRight } from "lucide-react" // Ícones para ilustrar
import Capybaraship from "../../../../public/images/capy-images/morning-capybaraship.png"
import Bacapybara from "../../../../public/images/capy-images/bacapybara.png"

// 1. Definimos os dados fora do componente para fácil manutenção
const resources = [
  {
    title: "Adoração Matinal",
    description: "Leia ou importe textos e conteúdos diários para sua meditação.",
    href: "/hub/spiritual/personal-study/morning-worship",
    image: Capybaraship,
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-600", // Cor sutil para o ícone
  },
  {
    title: "Backup do Aplicativo",
    description: "Gerencie, visualize ou restaure os backups da sua biblioteca pessoal.",
    href: "/hub/spiritual/personal-study/library-backup",
    image: Bacapybara,
    icon: Database,
    color: "bg-emerald-500/10 text-emerald-600",
  },
]

export default function NotesPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Estudo Pessoal
        </h1>
        <p className="text-muted-foreground text-lg">
          Recursos espirituais e materiais de estudo.
        </p>
      </div>

      {/* Grid de Recursos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className="group block h-full focus:outline-none"
          >
            <div className="h-full flex flex-col rounded-2xl border bg-card text-card-foreground overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
              
              {/* Área da Imagem */}
              <div className="relative w-full h-40 bg-muted overflow-hidden">
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10" />
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={false}
                />
                
                {/* Badge/Ícone Flutuante sobre a imagem */}
                <div className={`absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md bg-white/90 shadow-sm ${item.color} z-20`}>
                  <item.icon size={20} />
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="flex flex-col flex-grow p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg tracking-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
        
        {/* Card de "Novo Recurso" (Opcional - Placeholder para expansão futura) */}
        <button className="h-full min-h-[280px] rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/5 transition-all flex flex-col items-center justify-center text-muted-foreground gap-3 group">
            <div className="p-3 rounded-full bg-muted group-hover:bg-muted/80 transition-colors">
                <span className="text-2xl font-light">+</span>
            </div>
            <span className="text-sm font-medium">Adicionar Recurso</span>
        </button>

      </div>
    </div>
  )
}
