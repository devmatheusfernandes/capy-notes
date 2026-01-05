import { storage } from "@/lib/firebase"
import { ref, listAll, getMetadata } from "firebase/storage"

export const STORAGE_LIMITS = {
  pdf: 200 * 1024 * 1024, // 200 MB
  image: 100 * 1024 * 1024, // 100 MB
  backup: 50 * 1024 * 1024, // 50 MB
}

export type StorageType = "pdf" | "image" | "backup"

export async function getStorageUsage(userId: string, type: StorageType): Promise<number> {
  let folderPath = ""
  
  switch (type) {
    case "pdf":
      folderPath = `notes/${userId}/pdfs`
      break
    case "image":
      folderPath = `notes/${userId}`
      break
    case "backup":
      folderPath = `users/${userId}/backups`
      break
  }

  try {
    const folderRef = ref(storage, folderPath)
    const list = await listAll(folderRef)
    
    // Para imagens, precisamos filtrar apenas imagens se estiverem misturadas, 
    // mas baseada na estrutura `notes/${userId}`, pode haver subpastas ou arquivos mistos?
    // O código anterior assumia `notes/${userId}` para imagens e `notes/${userId}/pdfs` para pdfs.
    // Vamos manter a consistência com o que foi feito no StorageTab.
    
    const sizes = await Promise.all(
      list.items.map(async (item) => {
        try {
          const meta = await getMetadata(item)
          
          if (type === "image") {
            // Verifica se é imagem
            if (meta.contentType?.startsWith("image/")) {
              return meta.size
            }
            return 0
          }
          
          if (type === "pdf") {
            // Verifica se é PDF (embora estejam na pasta pdfs, segurança extra)
            if (meta.contentType === "application/pdf") {
              return meta.size
            }
            return 0
          }

          // Para backups, conta tudo na pasta de backups
          return meta.size
        } catch (e) {
          console.error(`Erro ao obter metadados para ${item.fullPath}`, e)
          return 0
        }
      })
    )

    return sizes.reduce((acc, curr) => acc + curr, 0)
  } catch (error) {
    console.error(`Erro ao calcular uso de armazenamento para ${type}`, error)
    return 0
  }
}

export async function checkStorageQuota(
  userId: string, 
  type: StorageType, 
  newFileSize: number
): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
  const currentUsage = await getStorageUsage(userId, type)
  const limit = STORAGE_LIMITS[type]
  
  return {
    allowed: currentUsage + newFileSize <= limit,
    currentUsage,
    limit
  }
}
