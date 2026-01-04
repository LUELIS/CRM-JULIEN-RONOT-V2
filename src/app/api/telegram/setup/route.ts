import { NextRequest, NextResponse } from "next/server"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action") || "info"
  const webhookUrl = searchParams.get("url")

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })
  }

  try {
    switch (action) {
      case "set":
        if (!webhookUrl) {
          return NextResponse.json(
            { error: "Missing url parameter. Example: ?action=set&url=https://your-domain.com/api/telegram/webhook" },
            { status: 400 }
          )
        }

        const setResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: webhookUrl,
              allowed_updates: ["message", "callback_query"],
            }),
          }
        )
        const setResult = await setResponse.json()
        return NextResponse.json({
          action: "setWebhook",
          url: webhookUrl,
          result: setResult,
        })

      case "delete":
        const deleteResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
          { method: "POST" }
        )
        const deleteResult = await deleteResponse.json()
        return NextResponse.json({
          action: "deleteWebhook",
          result: deleteResult,
        })

      case "info":
      default:
        // Get bot info
        const meResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
        )
        const meResult = await meResponse.json()

        // Get webhook info
        const webhookResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
        )
        const webhookResult = await webhookResponse.json()

        return NextResponse.json({
          bot: meResult.result,
          webhook: webhookResult.result,
          instructions: {
            setWebhook: "/api/telegram/setup?action=set&url=https://your-domain.com/api/telegram/webhook",
            deleteWebhook: "/api/telegram/setup?action=delete",
          },
        })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
