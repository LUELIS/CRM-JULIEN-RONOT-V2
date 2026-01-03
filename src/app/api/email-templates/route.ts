import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: List all templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")

    const where: Record<string, unknown> = {
      tenant_id: BigInt(1),
    }

    if (category) {
      where.category = category
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id.toString(),
        name: t.name,
        description: t.description,
        category: t.category,
        thumbnail: t.thumbnail,
        isDefault: t.isDefault,
        createdAt: t.createdAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

// POST: Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const template = await prisma.emailTemplate.create({
      data: {
        tenant_id: BigInt(1),
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        designJson: body.designJson || null,
        htmlContent: body.htmlContent || null,
        thumbnail: body.thumbnail || null,
        isDefault: body.isDefault || false,
      },
    })

    return NextResponse.json({
      id: template.id.toString(),
      success: true,
    })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}
