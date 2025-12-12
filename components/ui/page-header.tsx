"use client"

import Image, { type StaticImageData } from "next/image"

export function PageHeader({
  title,
  subtitle,
  image,
}: {
  title: string
  subtitle?: string
  image: string | StaticImageData
}) {
  return (
    <div className="w-full">
      <div className="relative w-full h-40 sm:h-56 md:h-64 bg-muted overflow-hidden rounded-t-lg">
        <div className="absolute inset-0 bg-black/5" />
        <Image
          src={image}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover"
          priority={false}
        />
      </div>
      <div className="px-4 md:px-6 py-4 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <p className="text-muted-foreground text-lg">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

