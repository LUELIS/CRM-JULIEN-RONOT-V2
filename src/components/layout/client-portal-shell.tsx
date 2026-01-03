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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const isPrimaryUser = (session?.user as any)?.isPrimaryUser
  const isImpersonating = (session?.user as any)?.isImpersonating

  const navigation = [
    { name: "Accueil", href: "/client-portal", icon: Home },
    { name: "Factures", href: "/client-portal/invoices", icon: FileText },
    { name: "Devis", href: "/client-portal/quotes", icon: FileCheck },
    { name: "Contrats", href: "/client-portal/contracts", icon: FileSignature },
    { name: "Services", href: "/client-portal/services", icon: Package },
    ...(isPrimaryUser ? [{ name: "Utilisateurs", href: "/client-portal/users", icon: Users }] : []),
  ]

  const isActive = (href: string) => {
    if (href === "/client-portal") {
      return pathname === "/client-portal"
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-50/40">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Mobile Header */}
      <header
        className="lg:hidden sticky z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60"
        style={{ top: isImpersonating ? "40px" : "0" }}
      >
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/client-portal" className="flex items-center gap-2.5">
              {tenant?.logo ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                  {tenant.logo.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tenant.logo}
                      alt={tenant.name || "Logo"}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Image
                      src={`/uploads/${tenant.logo}`}
                      alt={tenant.name || "Logo"}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="text-sm font-semibold text-slate-800">
                Espace Client
              </span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200/60 bg-white/95 backdrop-blur-xl">
            <div className="px-3 py-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-blue-500" : "text-slate-400"}`} />
                  {item.name}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-3 px-3 py-2.5 text-slate-500">
                  <User className="w-5 h-5" />
                  <span className="text-sm">{session?.user?.name}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/client/login" })}
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen">
        <div className="flex">
          {/* Floating Sidebar */}
          <div
            className="fixed left-6 bottom-6 z-40"
            style={{
              width: "220px",
              top: isImpersonating ? "calc(40px + 1.5rem)" : "1.5rem"
            }}
          >
            <aside className="h-full bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 border border-white/80 flex flex-col overflow-hidden">
              {/* Logo Section */}
              <div className="p-5">
                <Link href="/client-portal" className="flex items-center gap-3">
                  {tenant?.logo ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center shadow-sm">
                      {tenant.logo.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tenant.logo}
                          alt={tenant.name || "Logo"}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Image
                          src={`/uploads/${tenant.logo}`}
                          alt={tenant.name || "Logo"}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/25">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      {tenant?.name || "Mon Espace"}
                    </span>
                    <span className="text-xs text-slate-400">
                      Espace client
                    </span>
                  </div>
                </Link>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-600 hover:bg-slate-100/80"
                    }`}
                  >
                    <item.icon
                      className={`w-[18px] h-[18px] ${
                        isActive(item.href) ? "text-white/90" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>

              {/* User Section */}
              <div className="p-3 border-t border-slate-100">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/client/login" })}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50/80 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            </aside>
          </div>

          {/* Main Content */}
          <main
            className="flex-1 min-h-screen"
            style={{
              marginLeft: "256px",
              paddingTop: isImpersonating ? "40px" : "0"
            }}
          >
            <div className="p-8">
              {/* Content Card */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm shadow-slate-200/50 border border-white/80 min-h-[calc(100vh-64px)]">
                <div className="p-6">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Content */}
      <main className="lg:hidden px-4 py-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-white/80 p-5">
          {children}
        </div>
      </main>

      {/* Footer - Mobile only */}
      <footer className="lg:hidden py-6 text-center text-xs text-slate-400">
        {tenant?.name || "Espace Client"} © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
