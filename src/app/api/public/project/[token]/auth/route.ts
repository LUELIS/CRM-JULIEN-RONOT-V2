import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

// Helper to get project data
async function getProjectData(projectId: bigint) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
              comments: {
                select: { id: true },
              },
              attachments: {
                select: { id: true },
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

  if (!project) return null

  return {
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
        comments: card.comments.map((c) => ({ id: c.id.toString() })),
        attachments: card.attachments.map((a) => ({ id: a.id.toString() })),
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
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { email, name, guestToken } = body

    // Find project by share token
    const project = await prisma.project.findFirst({
      where: {
        shareToken: token,
        shareEnabled: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Projet non trouve ou partage desactive" },
        { status: 404 }
      )
    }

    // If guestToken provided, verify existing guest
    if (guestToken) {
      const existingGuest = await prisma.projectGuest.findFirst({
        where: {
          token: guestToken,
          projectId: project.id,
        },
      })

      if (existingGuest) {
        // Update last seen
        await prisma.projectGuest.update({
          where: { id: existingGuest.id },
          data: { lastSeenAt: new Date() },
        })

        const projectData = await getProjectData(project.id)

        return NextResponse.json({
          guest: {
            email: existingGuest.email,
            name: existingGuest.name,
            token: existingGuest.token,
          },
          project: projectData,
        })
      } else {
        return NextResponse.json({ error: "Token invalide" }, { status: 401 })
      }
    }

    // New guest authentication with email
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
    }

    // Check if guest is in the whitelist (invited)
    const guest = await prisma.projectGuest.findFirst({
      where: {
        projectId: project.id,
        email: email.toLowerCase(),
      },
    })

    if (!guest) {
      // Email not invited - reject access
      return NextResponse.json(
        { error: "Cet email n'est pas autorise a acceder a ce projet. Demandez une invitation au proprietaire." },
        { status: 403 }
      )
    }

    // Update name if provided and last seen
    await prisma.projectGuest.update({
      where: { id: guest.id },
      data: {
        name: name || guest.name,
        lastSeenAt: new Date(),
      },
    })

    const projectData = await getProjectData(project.id)

    return NextResponse.json({
      guest: {
        email: guest.email,
        name: guest.name,
        token: guest.token,
      },
      project: projectData,
    })
  } catch (error) {
    console.error("Error authenticating guest:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
