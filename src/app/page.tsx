import { redirect } from "next/navigation"

export default function Home() {
  // La page racine redirige toujours vers le dashboard
  // Le layout du dashboard vérifiera l'authentification
  redirect("/dashboard")
}
