import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SessionProvider } from "next-auth/react"
import { ClientPortalShell } from "@/components/layout/client-portal-shell"

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/client/login")
  }

  return (
    <SessionProvider session={session}>
      <ClientPortalShell>{children}</ClientPortalShell>
    </SessionProvider>
  )
}
