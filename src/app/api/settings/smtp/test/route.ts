import { NextRequest, NextResponse } from "next/server"
import * as net from "net"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { smtpHost, smtpPort, smtpEncryption } = body

    if (!smtpHost || !smtpPort) {
      return NextResponse.json({
        success: false,
        message: "Paramètres SMTP manquants",
      })
    }

    // Test TCP connection to SMTP server
    const connectionTest = await new Promise<{ success: boolean; message: string }>((resolve) => {
      const socket = new net.Socket()
      const timeout = 10000 // 10 seconds

      socket.setTimeout(timeout)

      socket.on("connect", () => {
        socket.destroy()
        resolve({
          success: true,
          message: `Connexion réussie à ${smtpHost}:${smtpPort} (${smtpEncryption?.toUpperCase() || "TLS"})`,
        })
      })

      socket.on("timeout", () => {
        socket.destroy()
        resolve({
          success: false,
          message: `Timeout: Impossible de se connecter à ${smtpHost}:${smtpPort}`,
        })
      })

      socket.on("error", (err) => {
        socket.destroy()
        resolve({
          success: false,
          message: `Erreur de connexion: ${err.message}`,
        })
      })

      socket.connect(parseInt(smtpPort), smtpHost)
    })

    return NextResponse.json(connectionTest)
  } catch (error) {
    console.error("SMTP test error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors du test SMTP",
    })
  }
}
