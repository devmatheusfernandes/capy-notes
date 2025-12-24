"use client"

import Image from "next/image"

export default function TasksPage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="relative h-42 w-42">
        <Image
          src="/images/capy-images/maintenence.png"
          alt="Capivara em construção"
          width={130}
          height={130}
          priority
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Em construção</h1>
        <p className="text-muted-foreground">
          Esta funcionalidade está sendo desenvolvida.
        </p>
      </div>
    </div>
  )
}
