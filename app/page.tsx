"use client"
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Image from "next/image";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signInWithGoogle } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect") || "/hub/profile"

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      setLoading(true)
      const maxAge = 400 * 24 * 60 * 60
      document.cookie = `auth=1; path=/; max-age=${maxAge}`
      router.push(redirectUrl)
    }
  }, [user, router, redirectUrl])

  return (
    <div>
      <div className="relative flex items-center justify-center h-screen dark:bg-gray-800">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>

        <Button onClick={handleGoogleLogin} disabled={loading}>
          <Image width={24} height={24} className="w-6 h-6" src="https://www.svgrepo.com/show/475656/google-color.svg" loading="lazy" alt="google logo" />
          <span>{user ? "Continuar com Google" : "Entrar com Google"}</span>
        </Button>

        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Spinner className="h-10 w-10 text-primary mb-4" />
            <span className="text-lg font-medium text-foreground">Entrando...</span>
          </div>
        )}
      </div>
    </div>
  )
}
