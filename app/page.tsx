"use client"
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Image from "next/image";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signInWithGoogle } from "@/lib/auth";

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } finally {
      setLoading(false)
    }
  }

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
      </div>
    </div>
  )
}
