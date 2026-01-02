import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { convertProspectToClient } from "@/lib/client-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { accept } = body

    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: { client: true },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis introuvable" },
        { status: 404 }
      )
    }

    if (quote.status !== "sent") {
      return NextResponse.json(
        { error: "Ce devis ne peut plus être modifié" },
        { status: 400 }
      )
    }

    // Check validity date
    if (new Date() > quote.validityDate) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "expired" },
      })
      return NextResponse.json(
        { error: "Ce devis a expiré" },
        { status: 400 }
      )
    }

    if (accept) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "accepted",
          signed_at: new Date(),
        },
      })

      // Auto-convert prospect to client when quote is accepted
      if (quote.clientId) {
        await convertProspectToClient(quote.clientId)
      }

      return NextResponse.json({
        success: true,
        message: "Merci ! Votre acceptation a été enregistrée. Nous vous contacterons prochainement.",
      })
    } else {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "rejected",
          rejectedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: "Votre refus a été enregistré. N'hésitez pas à nous contacter si vous avez des questions.",
      })
    }
  } catch (error) {
    console.error("Error responding to quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la réponse" },
      { status: 500 }
    )
  }
}
