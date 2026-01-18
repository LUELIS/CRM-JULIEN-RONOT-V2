/**
 * QR Code Database Client
 * Connects to external qrcode database on web.westarter.cloud
 */

import mysql from "mysql2/promise"

export interface QRCode {
  id: number
  name: string
  link: string
  tag: string | null
  created_at: Date | null
  updated_at: Date | null
}

export interface QRCodeClick {
  id: number
  qrcode_id: number
  browser: string
  ip: string
  location: string
  referer: string
  created_at: Date | null
  updated_at: Date | null
}

export interface QRCodeWithStats extends QRCode {
  click_count: number
}

// Connection pool for QR code database
let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.QRCODE_DB_HOST || "web.westarter.cloud",
      port: parseInt(process.env.QRCODE_DB_PORT || "3306"),
      user: process.env.QRCODE_DB_USER || "qrcode2",
      password: process.env.QRCODE_DB_PASSWORD || "d%a4O522w",
      database: process.env.QRCODE_DB_NAME || "qrcode",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    })
  }
  return pool
}

export async function getQRCodes(): Promise<QRCodeWithStats[]> {
  const pool = getPool()
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT
      q.*,
      COUNT(c.id) as click_count
    FROM qrcode q
    LEFT JOIN qrcode_click c ON c.qrcode_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `)
  return rows as QRCodeWithStats[]
}

export async function getQRCodeById(id: number): Promise<QRCode | null> {
  const pool = getPool()
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT * FROM qrcode WHERE id = ?",
    [id]
  )
  return (rows[0] as QRCode) || null
}

export async function createQRCode(data: {
  name: string
  link: string
  tag?: string
}): Promise<QRCode> {
  const pool = getPool()
  const now = new Date()
  const [result] = await pool.query<mysql.ResultSetHeader>(
    "INSERT INTO qrcode (name, link, tag, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [data.name, data.link, data.tag || null, now, now]
  )
  return {
    id: result.insertId,
    name: data.name,
    link: data.link,
    tag: data.tag || null,
    created_at: now,
    updated_at: now,
  }
}

export async function updateQRCode(
  id: number,
  data: { name?: string; link?: string; tag?: string }
): Promise<QRCode | null> {
  const pool = getPool()
  const updates: string[] = []
  const values: (string | Date)[] = []

  if (data.name !== undefined) {
    updates.push("name = ?")
    values.push(data.name)
  }
  if (data.link !== undefined) {
    updates.push("link = ?")
    values.push(data.link)
  }
  if (data.tag !== undefined) {
    updates.push("tag = ?")
    values.push(data.tag)
  }

  if (updates.length === 0) return getQRCodeById(id)

  updates.push("updated_at = ?")
  values.push(new Date())
  values.push(id as unknown as string)

  await pool.query(
    `UPDATE qrcode SET ${updates.join(", ")} WHERE id = ?`,
    values
  )

  return getQRCodeById(id)
}

export async function deleteQRCode(id: number): Promise<void> {
  const pool = getPool()
  // Delete clicks first
  await pool.query("DELETE FROM qrcode_click WHERE qrcode_id = ?", [id])
  // Delete qrcode
  await pool.query("DELETE FROM qrcode WHERE id = ?", [id])
}

export async function recordClick(
  qrcodeId: number,
  data: {
    browser: string
    ip: string
    location: string
    referer: string
  }
): Promise<void> {
  const pool = getPool()
  const now = new Date()
  await pool.query(
    "INSERT INTO qrcode_click (qrcode_id, browser, ip, location, referer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [qrcodeId, data.browser, data.ip, data.location, data.referer, now, now]
  )
}

export async function getClicksByQRCodeId(
  qrcodeId: number
): Promise<QRCodeClick[]> {
  const pool = getPool()
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT * FROM qrcode_click WHERE qrcode_id = ? ORDER BY created_at DESC LIMIT 100",
    [qrcodeId]
  )
  return rows as QRCodeClick[]
}

export async function getClickStats(qrcodeId: number): Promise<{
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byDay: { date: string; count: number }[]
  byLocation: { location: string; count: number }[]
  byBrowser: { browser: string; count: number }[]
}> {
  const pool = getPool()

  // Total clicks
  const [totalRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click WHERE qrcode_id = ?",
    [qrcodeId]
  )
  const total = totalRows[0]?.count || 0

  // Today
  const [todayRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click WHERE qrcode_id = ? AND DATE(created_at) = CURDATE()",
    [qrcodeId]
  )
  const today = todayRows[0]?.count || 0

  // This week
  const [weekRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click WHERE qrcode_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
    [qrcodeId]
  )
  const thisWeek = weekRows[0]?.count || 0

  // This month
  const [monthRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click WHERE qrcode_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
    [qrcodeId]
  )
  const thisMonth = monthRows[0]?.count || 0

  // By day (last 30 days)
  const [byDayRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM qrcode_click
     WHERE qrcode_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [qrcodeId]
  )

  // By location
  const [byLocationRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT location, COUNT(*) as count
     FROM qrcode_click
     WHERE qrcode_id = ?
     GROUP BY location
     ORDER BY count DESC
     LIMIT 10`,
    [qrcodeId]
  )

  // By browser (simplified)
  const [byBrowserRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT
       CASE
         WHEN browser LIKE '%Chrome%' AND browser NOT LIKE '%Edge%' THEN 'Chrome'
         WHEN browser LIKE '%Firefox%' THEN 'Firefox'
         WHEN browser LIKE '%Safari%' AND browser NOT LIKE '%Chrome%' THEN 'Safari'
         WHEN browser LIKE '%Edge%' THEN 'Edge'
         WHEN browser LIKE '%Opera%' THEN 'Opera'
         ELSE 'Autre'
       END as browser,
       COUNT(*) as count
     FROM qrcode_click
     WHERE qrcode_id = ?
     GROUP BY
       CASE
         WHEN browser LIKE '%Chrome%' AND browser NOT LIKE '%Edge%' THEN 'Chrome'
         WHEN browser LIKE '%Firefox%' THEN 'Firefox'
         WHEN browser LIKE '%Safari%' AND browser NOT LIKE '%Chrome%' THEN 'Safari'
         WHEN browser LIKE '%Edge%' THEN 'Edge'
         WHEN browser LIKE '%Opera%' THEN 'Opera'
         ELSE 'Autre'
       END
     ORDER BY count DESC`,
    [qrcodeId]
  )

  return {
    total,
    today,
    thisWeek,
    thisMonth,
    byDay: byDayRows.map((r) => ({
      date: r.date?.toISOString?.()?.split("T")[0] || String(r.date),
      count: r.count,
    })),
    byLocation: byLocationRows.map((r) => ({
      location: r.location,
      count: r.count,
    })),
    byBrowser: byBrowserRows.map((r) => ({
      browser: r.browser,
      count: r.count,
    })),
  }
}

export async function getGlobalStats(): Promise<{
  totalQRCodes: number
  totalClicks: number
  clicksToday: number
  clicksThisMonth: number
}> {
  const pool = getPool()

  const [qrRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode"
  )
  const [clickRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click"
  )
  const [todayRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click WHERE DATE(created_at) = CURDATE()"
  )
  const [monthRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM qrcode_click WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
  )

  return {
    totalQRCodes: qrRows[0]?.count || 0,
    totalClicks: clickRows[0]?.count || 0,
    clicksToday: todayRows[0]?.count || 0,
    clicksThisMonth: monthRows[0]?.count || 0,
  }
}
