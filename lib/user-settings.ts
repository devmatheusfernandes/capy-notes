import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import SHA256 from "crypto-js/sha256"

export async function setUserPin(userId: string, pin: string) {
  const pinHash = SHA256(pin).toString()
  const ref = doc(db, "users", userId)
  // Usa setDoc com merge para criar o documento se não existir ou atualizar se existir
  await setDoc(ref, { pinHash }, { merge: true })
}

export async function validateUserPin(userId: string, pin: string): Promise<boolean> {
  const ref = doc(db, "users", userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return false
  
  const data = snap.data()
  if (!data.pinHash) return false
  
  const inputHash = SHA256(pin).toString()
  return inputHash === data.pinHash
}

export async function hasUserPin(userId: string): Promise<boolean> {
  const ref = doc(db, "users", userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return false
  const data = snap.data()
  return !!data.pinHash
}
