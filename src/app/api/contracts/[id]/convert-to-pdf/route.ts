import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import puppeteer from "puppeteer"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Get the contract
    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contrat non trouvé" }, { status: 404 })
    }

    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Seuls les contrats en brouillon peuvent être convertis" },
        { status: 400 }
      )
    }

    if (!contract.content) {
      return NextResponse.json(
        { error: "Ce contrat n'a pas de contenu à convertir" },
        { status: 400 }
      )
    }

    // Get tenant info for header/footer
    const tenant = await prisma.tenants.findFirst({
      where: { id: contract.tenant_id },
    })

    // Create HTML template with styling
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm 2cm 3cm 2cm;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      font-size: 18pt;
      color: #1a1a1a;
      margin-bottom: 16px;
      border-bottom: 2px solid #0064FA;
      padding-bottom: 8px;
    }
    h2 {
      font-size: 14pt;
      color: #1a1a1a;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 12pt;
      color: #333;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    p {
      margin-bottom: 10px;
      text-align: justify;
    }
    ul, ol {
      margin-bottom: 10px;
      padding-left: 24px;
    }
    li {
      margin-bottom: 4px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }
    .header h1 {
      border: none;
      font-size: 22pt;
      color: #0064FA;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: #666;
      padding: 10px 0;
      border-top: 1px solid #ddd;
    }
    .signature-space {
      margin-top: 60px;
      page-break-inside: avoid;
    }
    .signature-block {
      display: inline-block;
      width: 45%;
      vertical-align: top;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${contract.title}</h1>
    ${tenant ? `<p>${tenant.name}</p>` : ""}
  </div>

  <div class="content">
    ${contract.content}
  </div>

  <div class="signature-space">
    <div class="signature-block">
      <p><strong>Le Prestataire</strong></p>
      <p>${tenant?.name || ""}</p>
      <div class="signature-line">
        <p>Signature :</p>
        <p>Date :</p>
      </div>
    </div>
    <div class="signature-block" style="float: right;">
      <p><strong>Le Client</strong></p>
      <p>${contract.client?.companyName || ""}</p>
      <div class="signature-line">
        <p>Signature :</p>
        <p>Date :</p>
      </div>
    </div>
  </div>
</body>
</html>
    `

    // Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "2cm",
        bottom: "3cm",
        left: "2cm",
        right: "2cm",
      },
    })

    await browser.close()

    // Save PDF to uploads folder
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "contracts")
    await mkdir(uploadsDir, { recursive: true })

    const filename = `contract-${id}-${Date.now()}.pdf`
    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, pdfBuffer)

    // Count pages (approximate based on content length)
    const pageCount = Math.ceil(contract.content.length / 3000) || 1

    // Create document record in database
    const document = await prisma.contractDocument.create({
      data: {
        contractId: BigInt(id),
        filename: `${contract.title}.pdf`,
        originalPath: `/uploads/contracts/${filename}`,
        pageCount,
        sortOrder: 0,
      },
    })

    return NextResponse.json({
      success: true,
      documentId: document.id.toString(),
      message: "PDF créé avec succès",
    })
  } catch (error) {
    console.error("Error converting contract to PDF:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la conversion" },
      { status: 500 }
    )
  }
}
