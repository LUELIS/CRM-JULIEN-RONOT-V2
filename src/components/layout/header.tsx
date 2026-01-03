"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell, Search, FileText, UserPlus, CreditCard, AlertCircle, X, Menu, Ticket, RefreshCw, Package, Globe, Clock, Command, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchModal } from "./search-modal"

interface Notification {
  id: string
  type: "invoice" | "client" | "payment" | "quote" | "ticket" | "subscription" | "system" | "domain_expiring" | "domain_expired" | "note_reminder"
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const notificationIcons = {
  invoice: FileText,
  client: UserPlus,
  payment: CreditCard,
  quote: FileText,
  ticket: Ticket,
  subscription: Package,
  system: AlertCircle,
  domain_expiring: Clock,
  domain_expired: Globe,
  note_reminder: StickyNote,
}

const notificationColors = {
  invoice: { bg: '#E3F2FD', color: '#0064FA' },
  client: { bg: '#F3E8FF', color: '#5F00BA' },
  payment: { bg: '#D4EDDA', color: '#28B95F' },
  quote: { bg: '#FEF3CD', color: '#F0783C' },
  ticket: { bg: '#FEF3CD', color: '#DCB40A' },
  subscription: { bg: '#E3F2FD', color: '#14B4E6' },
  system: { bg: '#F5F5F7', color: '#666666' },
  domain_expiring: { bg: '#FEF3CD', color: '#F0783C' },
  domain_expired: { bg: '#FEE2E8', color: '#F04B69' },
  note_reminder: { bg: '#FEF3CD', color: '#DCB40A' },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "A l'instant"
  if (minutes < 60) return `${minutes} min`
  if (hours < 24) return `${hours}h`
  if (days === 1) return "Hier"
  if (days < 7) return `${days}j`
  return date.toLocaleDateString("fr-FR")
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    if (isOpen) fetchNotifications()
  }, [isOpen, fetchNotifications])

  const markAsRead = async (id: string, link?: string | null) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      if (link) {
        setIsOpen(false)
        router.push(link)
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all as read:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" })
      const notification = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error removing notification:", error)
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center px-4 lg:px-6 border-b"
      style={{ background: '#FFFFFF', borderColor: '#EEEEEE' }}
    >
      {/* Left - Mobile menu */}
      <div className="flex items-center w-10 lg:w-[100px]">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-[10px] transition-colors hover:bg-[#F5F5F7]"
        >
          <Menu className="h-5 w-5" style={{ color: '#666666' }} />
        </button>
      </div>

      {/* Center - Search (prominent and centered) */}
      <div className="flex-1 flex justify-center px-2 sm:px-4">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 sm:gap-3 h-10 sm:h-11 w-full max-w-[520px] px-3 sm:px-4 rounded-[12px] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          style={{ background: '#F5F5F7', border: '1px solid #EEEEEE' }}
        >
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: '#666666' }} />
          <span className="flex-1 text-left text-sm truncate" style={{ color: '#999999' }}>
            <span className="hidden sm:inline">Rechercher clients, factures, devis...</span>
            <span className="sm:hidden">Rechercher...</span>
          </span>
          <kbd
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium flex-shrink-0"
            style={{ background: '#FFFFFF', color: '#666666', border: '1px solid #DDDDDD' }}
          >
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center justify-end gap-2 w-10 lg:w-[100px]">

        {/* Notifications */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-2.5 rounded-[10px] transition-colors hover:bg-[#F5F5F7]"
            >
              <Bell className="h-5 w-5" style={{ color: '#666666' }} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: '#F04B69' }}
                >
                  {unreadCount > 9 ? "9" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 sm:w-96 p-0 rounded-[16px] overflow-hidden border-0"
            style={{ background: '#FFFFFF', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: '#EEEEEE' }}
            >
              <div>
                <h3 className="text-[15px] font-medium" style={{ color: '#111111' }}>Notifications</h3>
                <p className="text-xs" style={{ color: '#999999' }}>
                  {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchNotifications}
                  className="p-2 rounded-[8px] transition-colors hover:bg-[#F5F5F7]"
                >
                  <RefreshCw className="h-4 w-4" style={{ color: '#666666' }} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors hover:bg-[#E3F2FD]"
                    style={{ color: '#0064FA' }}
                  >
                    Tout lu
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2" style={{ color: '#CCCCCC' }} />
                  <p className="text-sm" style={{ color: '#999999' }}>Aucune notification</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || AlertCircle
                  const colors = notificationColors[notification.type] || notificationColors.system

                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-[#F5F5F7]"
                      style={{
                        borderColor: '#EEEEEE',
                        background: !notification.isRead ? '#F9F9FB' : undefined
                      }}
                      onClick={() => markAsRead(notification.id, notification.link)}
                    >
                      <div
                        className="p-2 rounded-[10px] shrink-0"
                        style={{ background: colors.bg }}
                      >
                        <Icon className="h-4 w-4" style={{ color: colors.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-sm font-medium leading-tight"
                            style={{ color: !notification.isRead ? '#111111' : '#666666' }}
                          >
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(notification.id) }}
                            className="transition-colors hover:opacity-70 shrink-0"
                          >
                            <X className="h-3.5 w-3.5" style={{ color: '#CCCCCC' }} />
                          </button>
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#999999' }}>
                          {notification.message}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: '#CCCCCC' }}>
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ background: '#0064FA' }}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t" style={{ borderColor: '#EEEEEE' }}>
                <button
                  className="w-full py-2 rounded-[8px] text-xs font-medium transition-colors hover:bg-[#F5F5F7]"
                  style={{ color: '#0064FA' }}
                  onClick={() => { setIsOpen(false); router.push("/notifications") }}
                >
                  Voir tout
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
