"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  Ticket,
  Wallet,
  LogOut,
  Package,
  Settings,
  ChevronDown,
  Zap,
  PanelLeftClose,
  PanelRightOpen,
  X,
  FileSignature,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useTenant } from "@/contexts/tenant-context"

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  badge?: number
  children?: { id: string; label: string; href: string }[]
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", href: "/clients", icon: Users },
  {
    id: "billing",
    label: "Facturation",
    href: "/invoices",
    icon: FileText,
    children: [
      { id: "invoices", label: "Factures", href: "/invoices" },
      { id: "quotes", label: "Devis", href: "/quotes" },
    ],
  },
  { id: "contracts", label: "Contrats", href: "/contracts", icon: FileSignature },
  {
    id: "services",
    label: "Services",
    href: "/services",
    icon: Package,
    children: [
      { id: "services-list", label: "Catalogue", href: "/services" },
      { id: "domains", label: "Domaines", href: "/domains" },
      { id: "recurring", label: "Abonnements", href: "/recurring" },
    ],
  },
  { id: "treasury", label: "Trésorerie", href: "/treasury", icon: Wallet },
  { id: "tickets", label: "Tickets", href: "/tickets", icon: Ticket, badge: 3 },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen: mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["billing", "services"])
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true
    return item.children?.some((child) => isActive(child.href)) || false
  }

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId) ? prev.filter((m) => m !== menuId) : [...prev, menuId]
    )
  }

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"

  // Sidebar content
  const sidebarContent = (showLabels: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 h-16 border-b"
        style={{ borderColor: "#EEEEEE" }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          {tenant?.logo ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F5F7] flex items-center justify-center">
              <Image
                src={`/uploads/${tenant.logo}`}
                alt={tenant.name || "Logo"}
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#DCB40A" }}
            >
              <Zap className="w-6 h-6" style={{ color: "#111111" }} />
            </div>
          )}
          {showLabels && (
            <div className="min-w-0">
              <span className="text-[15px] font-semibold block" style={{ color: "#111111" }}>
                {tenant?.name?.split(" ")[0] || "Aurora"}
              </span>
              <span className="text-[11px] font-medium block" style={{ color: "#999999" }}>
                {tenant?.name?.split(" ").slice(1).join(" ") || "CRM"}
              </span>
            </div>
          )}
        </Link>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[#F5F5F7] flex-shrink-0"
            style={{ border: "1px solid #EEEEEE" }}
          >
            {collapsed ? (
              <PanelRightOpen className="w-4 h-4" style={{ color: "#666666" }} />
            ) : (
              <PanelLeftClose className="w-4 h-4" style={{ color: "#666666" }} />
            )}
          </button>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[#F5F5F7]"
          >
            <X className="w-4 h-4" style={{ color: "#666666" }} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isParentActive(item)
          const expanded = expandedMenus.includes(item.id)
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isHovered = hoveredItem === item.id

          return (
            <div key={item.id}>
              {hasChildren ? (
                <button
                  onClick={() => {
                    if (showLabels) {
                      toggleSubmenu(item.id)
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left relative"
                  style={{ background: active ? "#0064FA" : "transparent" }}
                >
                  <Icon
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: active ? "#FFFFFF" : "#666666" }}
                  />
                  {showLabels && (
                    <>
                      <span
                        className="flex-1 text-[14px] font-medium"
                        style={{ color: active ? "#FFFFFF" : "#444444" }}
                      >
                        {item.label}
                      </span>
                      <ChevronDown
                        className="w-4 h-4 transition-transform duration-200"
                        style={{
                          color: active ? "#FFFFFF" : "#CCCCCC",
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    </>
                  )}
                  {/* Tooltip when collapsed */}
                  {!showLabels && isHovered && (
                    <div
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50"
                      style={{ background: "#111111", color: "#FFFFFF" }}
                    >
                      {item.label}
                      <div
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                        style={{
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          borderRight: "6px solid #111111",
                        }}
                      />
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative"
                  style={{ background: active ? "#0064FA" : "transparent" }}
                >
                  <Icon
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: active ? "#FFFFFF" : "#666666" }}
                  />
                  {showLabels && (
                    <>
                      <span
                        className="flex-1 text-[14px] font-medium"
                        style={{ color: active ? "#FFFFFF" : "#444444" }}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold text-white flex items-center justify-center"
                          style={{ background: "#F04B69" }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!showLabels && item.badge && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background: "#F04B69" }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip when collapsed */}
                  {!showLabels && isHovered && (
                    <div
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50"
                      style={{ background: "#111111", color: "#FFFFFF" }}
                    >
                      {item.label}
                      <div
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                        style={{
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          borderRight: "6px solid #111111",
                        }}
                      />
                    </div>
                  )}
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && showLabels && (
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: expanded ? 200 : 0,
                    opacity: expanded ? 1 : 0,
                  }}
                >
                  <div
                    className="ml-5 pl-4 mt-1 mb-1 flex flex-col gap-0.5"
                    style={{ borderLeft: "1px solid #EEEEEE" }}
                  >
                    {item.children?.map((child) => {
                      const childActive = isActive(child.href)
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={isMobile ? onClose : undefined}
                          className="px-3 py-2 rounded-lg text-[13px] transition-all hover:bg-[#F5F5F7]"
                          style={{
                            color: childActive ? "#111111" : "#666666",
                            fontWeight: childActive ? 500 : 400,
                            background: childActive ? "#F5F5F7" : "transparent",
                          }}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: "#EEEEEE" }}>
        {/* Settings */}
        <Link
          href="/settings"
          onMouseEnter={() => setHoveredItem("settings")}
          onMouseLeave={() => setHoveredItem(null)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative hover:bg-[#F5F5F7]"
          style={{ background: isActive("/settings") ? "#0064FA" : "transparent" }}
        >
          <Settings
            className="w-5 h-5 flex-shrink-0"
            style={{ color: isActive("/settings") ? "#FFFFFF" : "#666666" }}
          />
          {showLabels && (
            <span
              className="flex-1 text-[14px] font-medium"
              style={{ color: isActive("/settings") ? "#FFFFFF" : "#444444" }}
            >
              Paramètres
            </span>
          )}
          {!showLabels && hoveredItem === "settings" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50"
              style={{ background: "#111111", color: "#FFFFFF" }}
            >
              Paramètres
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: "6px solid #111111",
                }}
              />
            </div>
          )}
        </Link>

        {/* User */}
        {showLabels && (
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-2xl cursor-pointer transition-colors hover:bg-[#F5F5F7]">
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#0064FA" }}
              >
                <span className="text-[11px] font-semibold text-white">{userInitials}</span>
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: "#28B95F", borderColor: "#FFFFFF" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "#111111" }}>
                {session?.user?.name || "Utilisateur"}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          onMouseEnter={() => setHoveredItem("logout")}
          onMouseLeave={() => setHoveredItem(null)}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#FEE2E8] relative"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" style={{ color: "#F04B69" }} />
          {showLabels && (
            <span className="text-[13px] font-medium" style={{ color: "#F04B69" }}>
              Déconnexion
            </span>
          )}
          {!showLabels && hoveredItem === "logout" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50"
              style={{ background: "#111111", color: "#FFFFFF" }}
            >
              Déconnexion
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: "6px solid #111111",
                }}
              />
            </div>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden lg:block h-screen flex-shrink-0 transition-all duration-300 relative z-10"
        style={{
          width: collapsed ? 72 : 260,
          background: "#FFFFFF",
          borderRight: "1px solid #EEEEEE",
        }}
      >
        {sidebarContent(!collapsed)}
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      )}

      {/* Mobile Sidebar */}
      <div
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300"
        style={{
          background: "#FFFFFF",
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.12)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {sidebarContent(true, true)}
      </div>
    </>
  )
}
