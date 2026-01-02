import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, signOut, setPersistence, browserLocalPersistence } from "firebase/auth"
import { auth } from "@/lib/firebase"

const provider = new GoogleAuthProvider()

async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence)
  const result = await signInWithPopup(auth, provider)
  const info = getAdditionalUserInfo(result)
  // 400 days in seconds
  const maxAge = 400 * 24 * 60 * 60
  document.cookie = `auth=1; path=/; max-age=${maxAge}`
  return { user: result.user, isNewUser: !!info?.isNewUser }
}

async function signOutUser() {
  await signOut(auth)
  document.cookie = "auth=; path=/; max-age=0"
}

export { signInWithGoogle, signOutUser }
