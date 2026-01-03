import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: BigInt(id) },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: template.id.toString(),
      name: template.name,
      description: template.description,
      category: template.category,
      designJson: template.designJson,
      htmlContent: template.htmlContent,
      thumbnail: template.thumbnail,
      isDefault: template.isDefault,
      createdAt: template.createdAt?.toISOString() || null,
      updatedAt: template.updatedAt?.toISOString() || null,
    })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    )
  }
}

// PUT: Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const template = await prisma.emailTemplate.update({
      where: { id: BigInt(id) },
      data: {
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
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

// DELETE: Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.emailTemplate.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
}
