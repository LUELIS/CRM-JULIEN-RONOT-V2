/**
 * QR Code Database Client
 * Uses Prisma to connect to the CRM database
 */

import { prisma } from "./prisma"

export interface QRCode {
  id: bigint
  tenant_id: bigint
  name: string
  link: string
  tag: string | null
  createdAt: Date
  updatedAt: Date
}

export interface QRCodeClick {
  id: bigint
  qrcodeId: bigint
  browser: string
  ip: string
  location: string
  referer: string
  createdAt: Date
  updatedAt: Date
}

export interface QRCodeWithStats extends QRCode {
  click_count: number
}

export async function getQRCodes(tenantId: bigint): Promise<QRCodeWithStats[]> {
  const qrcodes = await prisma.qRCode.findMany({
    where: { tenant_id: tenantId },
    include: {
      _count: {
        select: { clicks: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return qrcodes.map(qr => ({
    id: qr.id,
    tenant_id: qr.tenant_id,
    name: qr.name,
    link: qr.link,
    tag: qr.tag,
    createdAt: qr.createdAt,
    updatedAt: qr.updatedAt,
    click_count: qr._count.clicks
  }))
}

export async function getQRCodeById(id: bigint): Promise<QRCode | null> {
  return prisma.qRCode.findUnique({
    where: { id }
  })
}

export async function createQRCode(data: {
  tenant_id: bigint
  name: string
  link: string
  tag?: string
}): Promise<QRCode> {
  return prisma.qRCode.create({
    data: {
      tenant_id: data.tenant_id,
      name: data.name,
      link: data.link,
      tag: data.tag || null,
    }
  })
}

export async function updateQRCode(
  id: bigint,
  data: { name?: string; link?: string; tag?: string }
): Promise<QRCode | null> {
  return prisma.qRCode.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.link !== undefined && { link: data.link }),
      ...(data.tag !== undefined && { tag: data.tag }),
    }
  })
}

export async function deleteQRCode(id: bigint): Promise<void> {
  // Clicks are deleted automatically via cascade
  await prisma.qRCode.delete({
    where: { id }
  })
}

export async function recordClick(
  qrcodeId: bigint,
  data: {
    browser: string
    ip: string
    location: string
    referer: string
  }
): Promise<void> {
  await prisma.qRCodeClick.create({
    data: {
      qrcodeId,
      browser: data.browser,
      ip: data.ip,
      location: data.location,
      referer: data.referer,
    }
  })
}

export async function getClicksByQRCodeId(
  qrcodeId: bigint
): Promise<QRCodeClick[]> {
  return prisma.qRCodeClick.findMany({
    where: { qrcodeId },
    orderBy: { createdAt: "desc" },
    take: 100
  })
}

export async function getClickStats(qrcodeId: bigint): Promise<{
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byDay: { date: string; count: number }[]
  byLocation: { location: string; count: number }[]
  byBrowser: { browser: string; count: number }[]
}> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Total clicks
  const total = await prisma.qRCodeClick.count({
    where: { qrcodeId }
  })

  // Today
  const today = await prisma.qRCodeClick.count({
    where: {
      qrcodeId,
      createdAt: { gte: todayStart }
    }
  })

  // This week
  const thisWeek = await prisma.qRCodeClick.count({
    where: {
      qrcodeId,
      createdAt: { gte: weekAgo }
    }
  })

  // This month
  const thisMonth = await prisma.qRCodeClick.count({
    where: {
      qrcodeId,
      createdAt: { gte: monthAgo }
    }
  })

  // Get all clicks for grouping
  const clicks = await prisma.qRCodeClick.findMany({
    where: {
      qrcodeId,
      createdAt: { gte: monthAgo }
    },
    select: {
      createdAt: true,
      location: true,
      browser: true
    }
  })

  // Group by day
  const byDayMap = new Map<string, number>()
  clicks.forEach(click => {
    const date = click.createdAt.toISOString().split('T')[0]
    byDayMap.set(date, (byDayMap.get(date) || 0) + 1)
  })
  const byDay = Array.from(byDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))

  // Group by location
  const byLocationMap = new Map<string, number>()
  clicks.forEach(click => {
    byLocationMap.set(click.location, (byLocationMap.get(click.location) || 0) + 1)
  })
  const byLocation = Array.from(byLocationMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Group by browser (simplified)
  const byBrowserMap = new Map<string, number>()
  clicks.forEach(click => {
    let browserName = 'Autre'
    if (click.browser.includes('Chrome') && !click.browser.includes('Edge')) {
      browserName = 'Chrome'
    } else if (click.browser.includes('Firefox')) {
      browserName = 'Firefox'
    } else if (click.browser.includes('Safari') && !click.browser.includes('Chrome')) {
      browserName = 'Safari'
    } else if (click.browser.includes('Edge')) {
      browserName = 'Edge'
    } else if (click.browser.includes('Opera')) {
      browserName = 'Opera'
    }
    byBrowserMap.set(browserName, (byBrowserMap.get(browserName) || 0) + 1)
  })
  const byBrowser = Array.from(byBrowserMap.entries())
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    today,
    thisWeek,
    thisMonth,
    byDay,
    byLocation,
    byBrowser,
  }
}

export async function getGlobalStats(tenantId: bigint): Promise<{
  totalQRCodes: number
  totalClicks: number
  clicksToday: number
  clicksThisMonth: number
}> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const qrcodeIds = await prisma.qRCode.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  })
  const ids = qrcodeIds.map(q => q.id)

  const totalQRCodes = qrcodeIds.length

  const totalClicks = await prisma.qRCodeClick.count({
    where: { qrcodeId: { in: ids } }
  })

  const clicksToday = await prisma.qRCodeClick.count({
    where: {
      qrcodeId: { in: ids },
      createdAt: { gte: todayStart }
    }
  })

  const clicksThisMonth = await prisma.qRCodeClick.count({
    where: {
      qrcodeId: { in: ids },
      createdAt: { gte: monthAgo }
    }
  })

  return {
    totalQRCodes,
    totalClicks,
    clicksToday,
    clicksThisMonth,
  }
}
