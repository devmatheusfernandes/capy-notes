"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, type User, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { signOutUser } from "@/lib/auth"
import Image from "next/image"
import { LogOut, User as UserIcon } from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) return
      if (u.photoURL) {
        setPhoto(u.photoURL)
        return
      }
      const key = `mock_photo_${u.uid}`
      const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null
      if (existing) {
        setPhoto(existing)
      } else {
        const candidates = [
          "/images/mock-profile-picture/rick.jpg",
          "/images/mock-profile-picture/morty.jpg",
        ]
        const chosen = candidates[Math.floor(Math.random() * candidates.length)]
        setPhoto(chosen)
        if (typeof window !== "undefined") localStorage.setItem(key, chosen)
        try {
          await updateProfile(u, { photoURL: chosen })
        } catch {}
      }
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    await signOutUser()
    router.replace("/")
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Avatar */}
        <div className="flex justify-center">
          {photo ? (
            <Image
              src={photo}
              alt="Foto de perfil"
              className="size-32 rounded-full"
              width={96}
              height={96}
              loading="eager"
              priority
            />
          ) : (
            <div className="size-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm">
              <UserIcon className="size-10 text-gray-400" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-medium">
              {user?.displayName || "Usuário"}
            </h1>
            <p className="text-sm mt-1">
              {user?.email || "—"}
            </p>
          </div>

          {/* Logout Button */}
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full group hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="size-4 mr-2 group-hover:translate-x-[-2px] transition-transform" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  )
}
