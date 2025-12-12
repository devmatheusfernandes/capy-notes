"use client"

import Link from "next/link"

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium">Estudos Pessoais</h1>
        <p className="text-sm text-muted-foreground">Selecione um recurso para estudar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/hub/spiritual/personal-study/morning-worship" className="group block">
          <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden hover:shadow-md transition-all">
            <div className="w-full h-36 bg-muted overflow-hidden">
              <img
                src="https://cms-imgp.jw-cdn.org/img/p/jwbvod25/univ/art/jwbvod25_univ_wss_47_lg.jpg"
                alt="Adoração Matinal"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <div className="font-semibold">Adoração Matinal</div>
              <div className="text-sm text-muted-foreground">Leia ou importe conteúdos diários.</div>
            </div>
          </div>
        </Link>

          <Link href="/hub/spiritual/personal-study/library-backup" className="group block">
          <div className="rounded-2xl border bg-card text-card-foreground overflow-hidden hover:shadow-md transition-all">
            <div className="w-full h-36 bg-muted overflow-hidden">
              <img
                src="https://cms-imgp.jw-cdn.org/img/p/jwbvod25/univ/art/jwbvod25_univ_wss_47_lg.jpg"
                alt="Backup do Aplicativo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <div className="font-semibold">Backup do Aplicativo</div>
              <div className="text-sm text-muted-foreground">Leia ou importe backups do seu aplicativo.</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
