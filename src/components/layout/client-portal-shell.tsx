"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import {
  Zap,
  FileText,
  FileCheck,
  LogOut,
  Menu,
  X,
  User,
  Home,
  Users,
  Package,
  FileSignature,
} from "lucide-react"
import { ImpersonationBanner } from "./impersonation-banner"

interface TenantData {
  name: string
  logo: string | null
}

export function ClientPortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/client/login")
    }
  }, [status, router])

  useEffect(() => {
    fetch("/api/tenant")
      .then((res) => res.json())
      .then((data) => setTenant(data))
      .catch(() => {})
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F5F7" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const isPrimaryUser = (session?.user as any)?.isPrimaryUser
  const isImpersonating = (session?.user as any)?.isImpersonating

  const navigation = [
    { name: "Tableau de bord", href: "/client-portal", icon: Home },
    { name: "Mes factures", href: "/client-portal/invoices", icon: FileText },
    { name: "Mes devis", href: "/client-portal/quotes", icon: FileCheck },
    { name: "Mes contrats", href: "/client-portal/contracts", icon: FileSignature },
    { name: "Mes services", href: "/client-portal/services", icon: Package },
    ...(isPrimaryUser ? [{ name: "Utilisateurs", href: "/client-portal/users", icon: Users }] : []),
  ]

  const isActive = (href: string) => {
    if (href === "/client-portal") {
      return pathname === "/client-portal"
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F5F7" }}>
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Header */}
      <header
        className="sticky z-50"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #EEEEEE",
          top: isImpersonating ? "40px" : "0",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/client-portal" className="flex items-center gap-3">
              {tenant?.logo ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F5F7] flex items-center justify-center">
                  <Image
                    src={`/uploads/${tenant.logo}`}
                    alt={tenant.name || "Logo"}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#DCB40A" }}
                >
                  <Zap className="w-5 h-5" style={{ color: "#111111" }} />
                </div>
              )}
              <span className="text-lg font-semibold" style={{ color: "#111111" }}>
                {tenant?.name || "Espace Client"}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: isActive(item.href) ? "#0064FA" : "#444444",
                    background: isActive(item.href) ? "#E6F0FF" : "transparent",
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <button
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[#F5F5F7]"
                style={{ color: "#666666" }}
              >
                <User className="w-4 h-4" />
                <span>{session?.user?.name}</span>
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/client/login" })}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#FEE2E8]"
                style={{ color: "#F04B69" }}
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-[#F5F5F7]"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" style={{ color: "#444444" }} />
                ) : (
                  <Menu className="w-6 h-6" style={{ color: "#444444" }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t" style={{ background: "#FFFFFF", borderColor: "#EEEEEE" }}>
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: isActive(item.href) ? "#0064FA" : "#444444",
                    background: isActive(item.href) ? "#E6F0FF" : "transparent",
                  }}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-3 border-t" style={{ borderColor: "#EEEEEE" }}>
                <div className="flex items-center gap-3 px-3 py-3" style={{ color: "#666666" }}>
                  <User className="w-5 h-5" />
                  <span>{session?.user?.name}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/client/login" })}
                  className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[#FEE2E8]"
                  style={{ color: "#F04B69" }}
                >
                  <LogOut className="w-5 h-5" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs" style={{ color: "#AEAEAE" }}>
        {tenant?.name || "Aurora CRM"} &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
