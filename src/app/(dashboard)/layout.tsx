import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SessionProvider } from "next-auth/react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { TenantProvider } from "@/contexts/tenant-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <TenantProvider>
        <DashboardShell>{children}</DashboardShell>
      </TenantProvider>
    </SessionProvider>
  )
}
