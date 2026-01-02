"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F5F5F7' }}>
      {/* Sidebar (Rail + Panel on desktop, Drawer on mobile) */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      {/* Main content - adapts to sidebar */}
      <div className="relative flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
