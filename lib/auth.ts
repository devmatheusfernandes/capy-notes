import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

const provider = new GoogleAuthProvider()

async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  const info = getAdditionalUserInfo(result)
  return { user: result.user, isNewUser: !!info?.isNewUser }
}

async function signOutUser() {
  await signOut(auth)
}

export { signInWithGoogle, signOutUser }
