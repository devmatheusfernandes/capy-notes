import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

const provider = new GoogleAuthProvider()

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  const info = getAdditionalUserInfo(result)
  document.cookie = `auth=1; path=/; max-age=${60 * 60 * 24 * 7}`
  return { user: result.user, isNewUser: !!info?.isNewUser }
}

async function signOutUser() {
  await signOut(auth)
  document.cookie = "auth=; path=/; max-age=0"
}

export { signInWithGoogle, signOutUser }
