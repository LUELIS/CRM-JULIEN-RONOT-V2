import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Retrieve ticket settings
export async function GET() {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant non trouvé" }, { status: 404 })
    }

    // Parse settings JSON
    const settings = tenant.settings ? JSON.parse(tenant.settings as string) : {}

    return NextResponse.json({
      // Slack
      slackEnabled: settings.slackEnabled || false,
      slackWebhookUrl: settings.slackWebhookUrl || "",
      slackBotToken: settings.slackBotToken || "",
      slackChannelId: settings.slackChannelId || "",
      slackNotifyOnNew: settings.slackNotifyOnNew ?? true,
      slackNotifyOnReply: settings.slackNotifyOnReply ?? true,
      // OpenAI
      openaiEnabled: settings.openaiEnabled || false,
      openaiApiKey: settings.openaiApiKey || "",
      openaiModel: settings.openaiModel || "gpt-4o-mini",
      openaiAutoSuggest: settings.openaiAutoSuggest ?? true,
      openaiAutoClassify: settings.openaiAutoClassify ?? false,
      // O365
      o365Enabled: settings.o365Enabled || false,
      o365ClientId: settings.o365ClientId || "",
      o365ClientSecret: settings.o365ClientSecret || "",
      o365TenantId: settings.o365TenantId || "",
      o365SupportEmail: settings.o365SupportEmail || "",
      o365AutoSync: settings.o365AutoSync ?? false,
    })
  } catch (error) {
    console.error("Error fetching ticket settings:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    )
  }
}

// PUT - Update ticket settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { section, ...data } = body

    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant non trouvé" }, { status: 404 })
    }

    // Parse existing settings
    const existingSettings = tenant.settings ? JSON.parse(tenant.settings as string) : {}

    // Merge new settings based on section
    let updatedSettings = { ...existingSettings }

    switch (section) {
      case "slack":
        updatedSettings = {
          ...updatedSettings,
          slackEnabled: data.slackEnabled,
          slackWebhookUrl: data.slackWebhookUrl,
          slackBotToken: data.slackBotToken,
          slackChannelId: data.slackChannelId,
          slackNotifyOnNew: data.slackNotifyOnNew,
          slackNotifyOnReply: data.slackNotifyOnReply,
        }
        break

      case "openai":
        updatedSettings = {
          ...updatedSettings,
          openaiEnabled: data.openaiEnabled,
          openaiApiKey: data.openaiApiKey,
          openaiModel: data.openaiModel,
          openaiAutoSuggest: data.openaiAutoSuggest,
          openaiAutoClassify: data.openaiAutoClassify,
        }
        break

      case "o365":
        updatedSettings = {
          ...updatedSettings,
          o365Enabled: data.o365Enabled,
          o365ClientId: data.o365ClientId,
          o365ClientSecret: data.o365ClientSecret,
          o365TenantId: data.o365TenantId,
          o365SupportEmail: data.o365SupportEmail,
          o365AutoSync: data.o365AutoSync,
        }
        break

      default:
        return NextResponse.json(
          { error: "Section inconnue" },
          { status: 400 }
        )
    }

    // Save settings
    await prisma.tenants.update({
      where: { id: BigInt(1) },
      data: {
        settings: JSON.stringify(updatedSettings),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving ticket settings:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement des paramètres" },
      { status: 500 }
    )
  }
}
