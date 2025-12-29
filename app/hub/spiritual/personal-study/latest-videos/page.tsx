"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAllVideosGrouped, type CategoryGroup } from "@/lib/all-videos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Film, PlayCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function LatestVideosPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const groups = await getAllVideosGrouped()
        setCategories(groups)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Vídeos</h1>
        <p className="text-sm text-muted-foreground">
          Navegue pelas categorias dos vídeos.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {categories.map((cat) => (
            <motion.div
              key={cat.key}
              variants={itemVariants}
              onClick={() => router.push(`/hub/spiritual/personal-study/latest-videos/${cat.key}`)}
              className="cursor-pointer group"
            >
              <Card className="h-full overflow-hidden hover:shadow-lg transition-all border-muted group-hover:border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Film className="h-5 w-5 text-primary" />
                    {cat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video rounded-md overflow-hidden bg-muted mb-3">
                     {/* Show thumbnail of first video if available */}
                     {cat.videos[0]?.coverImage ? (
                       <img 
                         src={cat.videos[0].coverImage} 
                         alt={cat.title}
                         className="w-full h-full object-cover transition-transform group-hover:scale-105"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center">
                         <PlayCircle className="h-10 w-10 text-muted-foreground/50" />
                       </div>
                     )}
                     <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                       {cat.videos.length} vídeos
                     </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cat.videos[0]?.title} e mais...
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          
          {categories.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhuma categoria encontrada no momento.
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
