"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    title: "Notas e Anotações",
    description: "Crie, organize e gerencie suas anotações pessoais, rascunhos e ideias em um só lugar.",
    href: "/hub/notes",
    image: "/images/capy-images/study.png",
  },
  {
    title: "Leitura da Bíblia",
    description: "Acesse as escrituras sagradas, faça pesquisas e acompanhe sua leitura diária.",
    href: "/hub/spiritual/bible",
    image: "/images/capy-images/bible.png",
  },
  {
    title: "Estudo Pessoal",
    description: "Gerencie sua biblioteca de estudos, prepare materiais e aprofunde seu conhecimento.",
    href: "/hub/spiritual/personal-study",
    image: "/images/capy-images/morning-capybaraship.png",
  },
  {
    title: "Tarefas",
    description: "Organize suas tarefas, defina prioridades e acompanhe seu progresso.",
    href: "/hub/tasks",
    image: "/images/capy-images/tasks.png",
  },
  {
    title: "Seu Perfil",
    description: "Gerencie suas informações pessoais, preferências de conta e estatísticas.",
    href: "/hub/profile",
    image: "/images/capy-images/profibara.png",
  },
  {
    title: "Configurações",
    description: "Personalize a aparência, notificações e outras preferências do sistema.",
    href: "/hub/settings",
    image: "/images/capy-images/capysettings.png",
  },
]

export default function HubPage() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao CapyNotes Hub</h1>
        <p className="text-muted-foreground">
          Explore todas as funcionalidades que preparamos para você.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-rows-[400px_400px]">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className="group h-full block">
            {/* 1. Card transformado em flex-col */}
            <Card className="h-full !pt-0 flex flex-col items-start !overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
              
              {/* 2. Container da imagem usa flex-grow para ocupar o espaço sobrando */}
              <div className="relative w-full flex-grow overflow-hidden bg-muted/30">
                  {/* 3. & 4. Uso de 'fill' e 'object-cover' */}
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
              </div>
              
              {/* 5. Container para o texto não encolher */}
              <div className="flex-shrink-0 relative z-10 bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}