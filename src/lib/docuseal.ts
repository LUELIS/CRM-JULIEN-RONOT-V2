/**
 * DocuSeal Signature Service
 * Handles electronic signature workflow with DocuSeal API
 * API Docs: https://www.docuseal.com/docs/api
 */

const API_KEY = process.env.DOCUSEAL_API_KEY!
const API_URL = process.env.DOCUSEAL_API_URL || "https://api.docuseal.eu"

// Types
export interface FieldArea {
  x: number      // 0-1 relative position from left
  y: number      // 0-1 relative position from top
  w: number      // 0-1 relative width
  h: number      // 0-1 relative height
  page: number   // 1-indexed page number
}

export interface DocumentField {
  name: string
  type: "signature" | "initials" | "date" | "text" | "checkbox" | "image" | "stamp" | "file" | "payment" | "phone" | "cells"
  role: string   // e.g., "First Party", "Client"
  required?: boolean
  readonly?: boolean
  default_value?: string
  areas: FieldArea[]
}

export interface DocumentInput {
  name: string
  file: string   // Base64 encoded content OR URL
  fields?: DocumentField[]
}

export interface SubmitterInput {
  role: string
  email: string
  name?: string
  phone?: string
  external_id?: string
  send_email?: boolean
  send_sms?: boolean
  values?: Record<string, string>
  metadata?: Record<string, unknown>
  message?: {
    subject?: string
    body?: string
  }
}

export interface CreateSubmissionParams {
  name?: string
  documents: DocumentInput[]
  submitters: SubmitterInput[]
  send_email?: boolean
  send_sms?: boolean
  order?: "preserved" | "random"
  expire_at?: string  // ISO 8601 format
  completed_redirect_url?: string
  bcc_completed?: string
  reply_to?: string
  message?: {
    subject?: string
    body?: string
  }
}

export interface SubmitterResponse {
  id: number
  submission_id: number
  uuid: string
  email: string
  slug: string
  sent_at: string | null
  opened_at: string | null
  completed_at: string | null
  declined_at: string | null
  created_at: string
  updated_at: string
  name: string
  phone: string
  status: "pending" | "sent" | "opened" | "completed" | "declined"
  external_id: string | null
  metadata: Record<string, unknown>
  preferences: Record<string, unknown>
  role: string
  embed_src: string  // URL for embedded signing
}

export interface SubmissionResponse {
  id: number
  source: string
  submitters_order: string
  slug: string
  audit_log_url: string | null
  combined_document_url: string | null
  expire_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  status: "pending" | "completed" | "expired" | "archived"
  submitters: SubmitterResponse[]
}

export interface TemplateResponse {
  id: number
  slug: string
  name: string
  created_at: string
  updated_at: string
  folder_name: string | null
  archived_at: string | null
  external_id: string | null
}

class DocuSealService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}/api${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-Auth-Token": API_KEY,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      console.error("DocuSeal API Error:", error)
      throw new Error(`DocuSeal API Error: ${error.message || error.error || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create a submission from PDF documents
   * This creates a one-off submission without needing a template
   */
  async createSubmissionFromPDF(params: CreateSubmissionParams): Promise<SubmissionResponse> {
    console.log("Creating DocuSeal submission from PDF...")
    console.log("Submitters:", params.submitters.map(s => ({ role: s.role, email: s.email })))

    const result = await this.request<SubmissionResponse>("/submissions/pdf", {
      method: "POST",
      body: JSON.stringify(params),
    })

    console.log(`Submission created: ${result.id}, status: ${result.status}`)
    return result
  }

  /**
   * Create a submission from an existing template
   */
  async createSubmission(
    templateId: number,
    submitters: SubmitterInput[],
    options?: {
      send_email?: boolean
      send_sms?: boolean
      order?: "preserved" | "random"
      expire_at?: string
      completed_redirect_url?: string
      bcc_completed?: string
      reply_to?: string
      message?: { subject?: string; body?: string }
    }
  ): Promise<SubmissionResponse> {
    return this.request<SubmissionResponse>("/submissions", {
      method: "POST",
      body: JSON.stringify({
        template_id: templateId,
        submitters,
        ...options,
      }),
    })
  }

  /**
   * Get a submission by ID
   */
  async getSubmission(submissionId: number): Promise<SubmissionResponse> {
    return this.request<SubmissionResponse>(`/submissions/${submissionId}`)
  }

  /**
   * List all submissions
   */
  async listSubmissions(options?: {
    limit?: number
    offset?: number
    status?: "pending" | "completed" | "expired" | "archived"
  }): Promise<{ data: SubmissionResponse[]; pagination: { count: number } }> {
    const params = new URLSearchParams()
    if (options?.limit) params.append("limit", options.limit.toString())
    if (options?.offset) params.append("offset", options.offset.toString())
    if (options?.status) params.append("status", options.status)

    const query = params.toString()
    return this.request(`/submissions${query ? `?${query}` : ""}`)
  }

  /**
   * Get submission documents (signed PDFs)
   */
  async getSubmissionDocuments(submissionId: number): Promise<{
    documents: Array<{ name: string; url: string }>
    audit_log_url: string
  }> {
    return this.request(`/submissions/${submissionId}/documents`)
  }

  /**
   * Archive (soft delete) a submission
   */
  async archiveSubmission(submissionId: number): Promise<{ id: number; archived_at: string }> {
    return this.request(`/submissions/${submissionId}`, {
      method: "DELETE",
    })
  }

  /**
   * Get a submitter by ID
   */
  async getSubmitter(submitterId: number): Promise<SubmitterResponse> {
    return this.request(`/submitters/${submitterId}`)
  }

  /**
   * Update a submitter (e.g., resend email)
   */
  async updateSubmitter(
    submitterId: number,
    data: Partial<SubmitterInput>
  ): Promise<SubmitterResponse> {
    return this.request(`/submitters/${submitterId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  /**
   * List templates
   */
  async listTemplates(options?: {
    limit?: number
    offset?: number
    folder?: string
  }): Promise<{ data: TemplateResponse[]; pagination: { count: number } }> {
    const params = new URLSearchParams()
    if (options?.limit) params.append("limit", options.limit.toString())
    if (options?.offset) params.append("offset", options.offset.toString())
    if (options?.folder) params.append("folder", options.folder)

    const query = params.toString()
    return this.request(`/templates${query ? `?${query}` : ""}`)
  }

  /**
   * Get signing URL for a submitter
   * Returns the embed_src URL that can be used for signing
   */
  getSigningUrl(submitter: SubmitterResponse): string {
    // The embed_src URL is for embedded signing
    // For direct signing, construct the URL from the slug
    return `https://docuseal.eu/s/${submitter.slug}`
  }

  /**
   * Convert PDF coordinates (points) to DocuSeal coordinates (0-1 relative)
   * DocuSeal uses relative coordinates where:
   * - x, y: 0-1 position from top-left
   * - w, h: 0-1 relative to page size
   */
  convertCoordinates(
    x: number,        // PDF x in points
    y: number,        // PDF y in points
    width: number,    // Field width in points
    height: number,   // Field height in points
    pageWidth: number = 595,   // A4 width in points
    pageHeight: number = 842   // A4 height in points
  ): FieldArea {
    return {
      x: Math.max(0, Math.min(1, x / pageWidth)),
      y: Math.max(0, Math.min(1, y / pageHeight)),
      w: Math.max(0.01, Math.min(1, width / pageWidth)),
      h: Math.max(0.01, Math.min(1, height / pageHeight)),
      page: 1, // Will be set by caller
    }
  }
}

// Export singleton instance
export const docuseal = new DocuSealService()
