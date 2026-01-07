"use client"

import { useState, useEffect } from "react"
import { Monitor, Apple, Download, Shield, Headphones, ArrowRight, Loader2 } from "lucide-react"
import Image from "next/image"

interface DownloadFile {
  id: string
  platform: "windows" | "macos"
  fileName: string
  version: string | null
  fileSize: number
  downloadCount: number
}

interface TenantInfo {
  name: string
  logo: string | null
  supportPhone: string | null
  supportEmail: string | null
}

export default function SupportDownloadPage() {
  const [downloads, setDownloads] = useState<DownloadFile[]>([])
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/public/support-downloads")
      if (response.ok) {
        const data = await response.json()
        setDownloads(data.downloads || [])
        setTenant(data.tenant || null)
      }
    } catch (error) {
      console.error("Error fetching downloads:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (file: DownloadFile) => {
    setDownloading(file.id)
    try {
      const response = await fetch(`/api/public/support-downloads/${file.id}`)
      if (response.ok) {
        const data = await response.json()
        // Redirect to presigned URL
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error downloading:", error)
    } finally {
      setTimeout(() => setDownloading(null), 1000)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const windowsFile = downloads.find((d) => d.platform === "windows")
  const macFile = downloads.find((d) => d.platform === "macos")

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          {tenant?.logo ? (
            <div className="flex justify-center mb-6">
              <Image
                src={tenant.logo}
                alt={tenant.name}
                width={180}
                height={60}
                className="h-14 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Headphones className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Assistance à distance
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Téléchargez notre logiciel de prise en main à distance pour permettre à notre équipe de vous assister directement sur votre ordinateur.
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Windows Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Windows</h2>
                <p className="text-slate-400">Windows 10/11</p>
              </div>
            </div>

            {windowsFile ? (
              <>
                <div className="space-y-2 mb-6 text-sm text-slate-400">
                  <p>Version: {windowsFile.version || "Dernière"}</p>
                  <p>Taille: {formatFileSize(windowsFile.fileSize)}</p>
                  <p>{windowsFile.downloadCount.toLocaleString()} téléchargements</p>
                </div>
                <button
                  onClick={() => handleDownload(windowsFile)}
                  disabled={downloading === windowsFile.id}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                  {downloading === windowsFile.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Télécharger pour Windows
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Bientôt disponible</p>
              </div>
            )}
          </div>

          {/* Mac Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <Apple className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">macOS</h2>
                <p className="text-slate-400">macOS 11+</p>
              </div>
            </div>

            {macFile ? (
              <>
                <div className="space-y-2 mb-6 text-sm text-slate-400">
                  <p>Version: {macFile.version || "Dernière"}</p>
                  <p>Taille: {formatFileSize(macFile.fileSize)}</p>
                  <p>{macFile.downloadCount.toLocaleString()} téléchargements</p>
                </div>
                <button
                  onClick={() => handleDownload(macFile)}
                  disabled={downloading === macFile.id}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-slate-500/30 transition-all disabled:opacity-50"
                >
                  {downloading === macFile.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Télécharger pour Mac
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Apple className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Bientôt disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 mb-12">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <ArrowRight className="w-5 h-5 text-purple-400" />
            Comment utiliser ?
          </h3>
          <ol className="space-y-4 text-slate-300">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">1</span>
              <p>Téléchargez le logiciel correspondant à votre système d&apos;exploitation</p>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">2</span>
              <p>Lancez le fichier téléchargé (pas d&apos;installation requise)</p>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">3</span>
              <p>Communiquez votre <strong>ID</strong> et <strong>Mot de passe</strong> à notre technicien</p>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">4</span>
              <p>Notre équipe prendra le contrôle de votre écran pour vous aider</p>
            </li>
          </ol>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-4 bg-green-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20">
          <Shield className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-400 mb-1">Connexion sécurisée</h4>
            <p className="text-slate-400 text-sm">
              La connexion est entièrement chiffrée et vous gardez le contrôle à tout moment.
              Vous pouvez arrêter la session en fermant simplement le logiciel.
            </p>
          </div>
        </div>

        {/* Contact */}
        {(tenant?.supportPhone || tenant?.supportEmail) && (
          <div className="text-center mt-12 text-slate-400">
            <p>Besoin d&apos;aide ? Contactez-nous</p>
            <div className="flex items-center justify-center gap-6 mt-2">
              {tenant.supportPhone && (
                <a href={`tel:${tenant.supportPhone}`} className="text-white hover:text-purple-400 transition-colors">
                  {tenant.supportPhone}
                </a>
              )}
              {tenant.supportEmail && (
                <a href={`mailto:${tenant.supportEmail}`} className="text-white hover:text-purple-400 transition-colors">
                  {tenant.supportEmail}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {tenant?.name || "Support"}. Tous droits réservés.</p>
        </footer>
      </div>
    </div>
  )
}
