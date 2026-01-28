import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public API - No authentication required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find project by share token
    const project = await prisma.project.findFirst({
      where: {
        shareToken: token,
        shareEnabled: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        columns: {
          select: {
            id: true,
            name: true,
            color: true,
            position: true,
            cards: {
              select: {
                id: true,
                title: true,
                description: true,
                position: true,
                priority: true,
                dueDate: true,
                isCompleted: true,
                subtasks: {
                  select: {
                    id: true,
                    title: true,
                    isCompleted: true,
                  },
                },
                cardLabels: {
                  select: {
                    label: {
                      select: {
                        id: true,
                        name: true,
                        color: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        labels: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Projet non trouve ou partage desactive" },
        { status: 404 }
      )
    }

    // Transform data for frontend
    const transformedProject = {
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      color: project.color,
      columns: project.columns.map((col) => ({
        id: col.id.toString(),
        name: col.name,
        color: col.color,
        position: col.position,
        cards: col.cards.map((card) => ({
          id: card.id.toString(),
          title: card.title,
          description: card.description,
          position: card.position,
          priority: card.priority,
          dueDate: card.dueDate?.toISOString() || null,
          isCompleted: card.isCompleted,
          subtasks: card.subtasks.map((st) => ({
            id: st.id.toString(),
            title: st.title,
            isCompleted: st.isCompleted,
          })),
          cardLabels: card.cardLabels.map((cl) => ({
            id: cl.label.id.toString(),
            name: cl.label.name,
            color: cl.label.color,
          })),
        })),
      })),
      labels: project.labels.map((l) => ({
        id: l.id.toString(),
        name: l.name,
        color: l.color,
      })),
    }

    return NextResponse.json(transformedProject)
  } catch (error) {
    console.error("Error fetching shared project:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
