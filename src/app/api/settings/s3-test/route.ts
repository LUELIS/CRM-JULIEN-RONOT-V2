import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"

// POST /api/settings/s3-test - Test S3 connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { s3Endpoint, s3Region, s3AccessKey, s3SecretKey, s3Bucket, s3ForcePathStyle } = body

    if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
      return NextResponse.json(
        { error: "Tous les champs S3 sont requis" },
        { status: 400 }
      )
    }

    // Create S3 client with provided credentials
    const s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: s3Region || "fr-par",
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
      forcePathStyle: s3ForcePathStyle ?? true,
    })

    // Try to list objects in the bucket (limited to 1 to minimize overhead)
    const command = new ListObjectsV2Command({
      Bucket: s3Bucket,
      MaxKeys: 1,
    })

    await s3Client.send(command)

    return NextResponse.json({
      success: true,
      message: `Connexion au bucket "${s3Bucket}" réussie`,
    })
  } catch (error) {
    console.error("S3 test error:", error)

    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

    // Parse common S3 errors
    let friendlyMessage = "Erreur de connexion S3"
    if (errorMessage.includes("InvalidAccessKeyId")) {
      friendlyMessage = "Access Key invalide"
    } else if (errorMessage.includes("SignatureDoesNotMatch")) {
      friendlyMessage = "Secret Key invalide"
    } else if (errorMessage.includes("NoSuchBucket")) {
      friendlyMessage = "Bucket introuvable"
    } else if (errorMessage.includes("AccessDenied")) {
      friendlyMessage = "Accès refusé - vérifiez les permissions"
    } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      friendlyMessage = "Endpoint S3 introuvable - vérifiez l'URL"
    } else if (errorMessage.includes("ECONNREFUSED")) {
      friendlyMessage = "Connexion refusée - vérifiez l'endpoint"
    }

    return NextResponse.json(
      { error: friendlyMessage, details: errorMessage },
      { status: 400 }
    )
  }
}
