import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"

// Aurora CRM Color Palette
const colors = {
  primary: "#0064FA",
  success: "#28B95F",
  warning: "#DCB40A",
  danger: "#F04B69",
  orange: "#F0783C",
  purple: "#5F00BA",
  text: {
    dark: "#111111",
    medium: "#444444",
    light: "#666666",
    muted: "#999999",
    subtle: "#AEAEAE",
  },
  border: {
    light: "#EEEEEE",
    medium: "#DDDDDD",
  },
  background: {
    light: "#F5F5F7",
    white: "#FFFFFF",
  },
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text.dark,
    backgroundColor: colors.background.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: 260,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: "contain",
    flexShrink: 0,
  },
  companyDetails: {
    width: 200,
  },
  companyName: {
    fontSize: 18,
    color: colors.text.dark,
    fontWeight: "bold",
    marginBottom: 8,
  },
  companyInfo: {
    fontSize: 9,
    color: colors.text.light,
    lineHeight: 1.5,
  },
  quoteTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "right",
    color: colors.text.dark,
    marginBottom: 8,
    letterSpacing: 1,
  },
  quoteNumber: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "bold",
    textAlign: "right",
  },
  quoteMeta: {
    fontSize: 9,
    color: colors.text.muted,
    textAlign: "right",
    marginTop: 10,
    lineHeight: 1.5,
  },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  party: {
    width: "45%",
  },
  partyLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: colors.text.muted,
    marginBottom: 8,
    letterSpacing: 1,
  },
  partyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text.dark,
    marginBottom: 6,
  },
  partyDetails: {
    fontSize: 9,
    color: colors.text.light,
    lineHeight: 1.5,
  },
  validityNotice: {
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  validityText: {
    fontSize: 9,
    color: colors.text.medium,
  },
  table: {
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.background.light,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
  },
  tableHeaderText: {
    fontSize: 8,
    textTransform: "uppercase",
    color: colors.text.light,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tableCell: {
    fontSize: 9,
    color: colors.text.medium,
  },
  tableCellTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.text.dark,
    marginBottom: 3,
  },
  tableCellDescription: {
    fontSize: 8,
    color: colors.text.light,
  },
  colDescription: {
    width: "45%",
  },
  colQty: {
    width: "15%",
    textAlign: "right",
  },
  colPrice: {
    width: "20%",
    textAlign: "right",
  },
  colTotal: {
    width: "20%",
    textAlign: "right",
  },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 30,
  },
  totalsTable: {
    width: 220,
    backgroundColor: colors.background.light,
    borderRadius: 8,
    padding: 15,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalsLabel: {
    fontSize: 9,
    color: colors.text.light,
  },
  totalsValue: {
    fontSize: 9,
    color: colors.text.medium,
  },
  totalsDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    marginVertical: 8,
  },
  totalsFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  totalsFinalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text.dark,
  },
  totalsFinalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  footer: {
    marginTop: 20,
  },
  terms: {
    backgroundColor: colors.background.light,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text.dark,
    marginBottom: 10,
  },
  termsText: {
    fontSize: 9,
    color: colors.text.light,
    lineHeight: 1.5,
  },
  notes: {
    fontSize: 9,
    color: colors.text.light,
    fontStyle: "italic",
    marginBottom: 15,
    padding: 10,
    backgroundColor: colors.background.light,
    borderRadius: 6,
  },
  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    gap: 20,
  },
  signatureBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    backgroundColor: colors.background.light,
  },
  signatureTitle: {
    fontSize: 9,
    color: colors.text.light,
    marginBottom: 35,
    textAlign: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: colors.text.dark,
    width: "100%",
    paddingTop: 8,
    marginTop: 20,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.text.muted,
    textAlign: "center",
  },
  legal: {
    fontSize: 8,
    color: colors.text.subtle,
    textAlign: "center",
    marginTop: 25,
    lineHeight: 1.5,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
})

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#F5F5F7", text: "#666666" },
  sent: { bg: "#E6F0FF", text: "#0064FA" },
  accepted: { bg: "#E8F8EE", text: "#28B95F" },
  rejected: { bg: "#FEE2E8", text: "#F04B69" },
  expired: { bg: "#FFF9E6", text: "#DCB40A" },
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
}

function formatCurrency(amount: number): string {
  // Formater manuellement pour éviter les problèmes d'espaces avec React-PDF
  // Utilise un formatage manuel pour éviter les espaces insécables et fines
  const parts = amount.toFixed(2).split(".")
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  const decPart = parts[1]
  return `${intPart},${decPart} €`
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export interface QuoteItem {
  title: string
  description: string
  quantity: number
  unitPriceHt: number
  totalHt: number
}

export interface QuoteData {
  quoteNumber: string
  issueDate: Date | string
  validityDate: Date | string
  status: string
  notes?: string
  termsConditions?: string
  subtotalHt: number
  taxAmount: number
  totalTtc: number
  client: {
    companyName: string
    address?: string
    postalCode?: string
    city?: string
    email?: string
    siret?: string
  }
  items: QuoteItem[]
}

export interface TenantData {
  name: string
  address?: string
  email?: string
  phone?: string
  logo?: string | null
}

export interface SettingsData {
  postalCode?: string
  city?: string
  siret?: string
  quoteFooter?: string
}

interface QuotePDFProps {
  quote: QuoteData
  tenant: TenantData
  settings: SettingsData
}

export function QuotePDF({ quote, tenant, settings }: QuotePDFProps) {
  const status = quote.status || "draft"
  const statusColor = statusColors[status] || statusColors.draft

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyHeader}>
            {tenant.logo && (
              <Image src={tenant.logo} style={styles.logo} />
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{tenant.name || "Mon Entreprise"}</Text>
              <Text style={styles.companyInfo}>
                {tenant.address || ""}
                {"\n"}
                {settings.postalCode || ""} {settings.city || ""}
                {"\n"}
                {tenant.email || ""}
                {tenant.phone ? `\n${tenant.phone}` : ""}
                {settings.siret ? `\nSIRET: ${settings.siret}` : ""}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.quoteTitle}>DEVIS</Text>
            <Text style={styles.quoteNumber}>{quote.quoteNumber}</Text>
            <Text style={styles.quoteMeta}>
              Date d'émission : {formatDate(quote.issueDate)}
              {"\n"}
              Valide jusqu'au : {formatDate(quote.validityDate)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor.bg },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {statusLabels[status] || status}
              </Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Émetteur</Text>
            <Text style={styles.partyName}>{tenant.name || "Mon Entreprise"}</Text>
            <Text style={styles.partyDetails}>
              {tenant.address || ""}
              {"\n"}
              {settings.postalCode || ""} {settings.city || ""}
              {"\n"}
              {tenant.email || ""}
            </Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Client</Text>
            <Text style={styles.partyName}>{quote.client.companyName}</Text>
            <Text style={styles.partyDetails}>
              {quote.client.address || ""}
              {"\n"}
              {quote.client.postalCode || ""} {quote.client.city || ""}
              {"\n"}
              {quote.client.email || ""}
              {quote.client.siret ? `\nSIRET: ${quote.client.siret}` : ""}
            </Text>
          </View>
        </View>

        {/* Validity Notice */}
        <View style={styles.validityNotice}>
          <Text style={styles.validityText}>
            Validité du devis : Ce devis est valable jusqu'au {formatDate(quote.validityDate)}.
            Passé ce délai, les prix et conditions peuvent être révisés.
          </Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Prix unitaire HT</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
          </View>

          {/* Rows */}
          {quote.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colDescription}>
                <Text style={styles.tableCellTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.tableCellDescription}>{item.description}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrency(item.unitPriceHt)}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrency(item.totalHt)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sous-total HT</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quote.subtotalHt)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA (20%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quote.taxAmount)}</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalsFinal}>
              <Text style={styles.totalsFinalLabel}>Total TTC</Text>
              <Text style={styles.totalsFinalValue}>
                {formatCurrency(quote.totalTtc)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Terms */}
          {quote.termsConditions && (
            <View style={styles.terms}>
              <Text style={styles.termsTitle}>Conditions générales</Text>
              <Text style={styles.termsText}>{quote.termsConditions}</Text>
            </View>
          )}

          {/* Notes */}
          {quote.notes && (
            <View style={styles.notes}>
              <Text>Notes : {quote.notes}</Text>
            </View>
          )}

          {/* Signature Area */}
          <View style={styles.signatureArea}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>Bon pour accord - Le client</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Date et signature</Text>
              </View>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>L'émetteur</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>{tenant.name || ""}</Text>
              </View>
            </View>
          </View>

          {/* Legal */}
          <Text style={styles.legal}>
            {settings.quoteFooter || ""}
            {"\n\n"}
            Document généré par Aurora CRM
          </Text>
        </View>
      </Page>
    </Document>
  )
}
