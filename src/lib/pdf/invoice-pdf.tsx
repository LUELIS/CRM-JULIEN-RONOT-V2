import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer"

// Register fonts (using built-in Helvetica)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
})

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
  invoiceTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "right",
    color: colors.text.dark,
    marginBottom: 8,
    letterSpacing: 1,
  },
  invoiceNumber: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "bold",
    textAlign: "right",
  },
  invoiceMeta: {
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
    marginBottom: 30,
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
  colDescription: {
    width: "40%",
  },
  colQty: {
    width: "10%",
    textAlign: "right",
  },
  colUnit: {
    width: "10%",
    textAlign: "center",
  },
  colPrice: {
    width: "15%",
    textAlign: "right",
  },
  colVat: {
    width: "10%",
    textAlign: "right",
  },
  colTotal: {
    width: "15%",
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
  paymentInfo: {
    backgroundColor: colors.background.light,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text.dark,
    marginBottom: 10,
  },
  paymentText: {
    fontSize: 9,
    color: colors.text.light,
    lineHeight: 1.6,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 9,
    color: colors.text.muted,
    width: 60,
  },
  paymentValue: {
    fontSize: 9,
    color: colors.text.medium,
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
  paid: { bg: "#E8F8EE", text: "#28B95F" },
  overdue: { bg: "#FEE2E8", text: "#F04B69" },
  cancelled: { bg: "#F5F5F7", text: "#999999" },
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
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

export interface InvoiceItem {
  description: string
  quantity: number
  unit: string
  unitPriceHt: number
  vatRate: number
  totalHt: number
  service?: { name: string }
}

export interface InvoiceData {
  invoiceNumber: string
  issueDate: Date | string
  dueDate: Date | string
  status: string
  notes?: string
  subtotalHt: number
  taxAmount: number
  discountAmount?: number
  totalTtc: number
  client: {
    companyName: string
    address?: string
    postalCode?: string
    city?: string
    email?: string
    siret?: string
  }
  items: InvoiceItem[]
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
  iban?: string
  bic?: string
  bankName?: string
  paymentTerms?: number
  lateFee?: number
  invoiceFooter?: string
}

interface InvoicePDFProps {
  invoice: InvoiceData
  tenant: TenantData
  settings: SettingsData
}

export function InvoicePDF({ invoice, tenant, settings }: InvoicePDFProps) {
  const status = invoice.status || "draft"
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
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>
              Date d'émission : {formatDate(invoice.issueDate)}
              {"\n"}
              Date d'échéance : {formatDate(invoice.dueDate)}
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
            <Text style={styles.partyLabel}>Facturé à</Text>
            <Text style={styles.partyName}>{invoice.client.companyName}</Text>
            <Text style={styles.partyDetails}>
              {invoice.client.address || ""}
              {"\n"}
              {invoice.client.postalCode || ""} {invoice.client.city || ""}
              {"\n"}
              {invoice.client.email || ""}
              {invoice.client.siret ? `\nSIRET: ${invoice.client.siret}` : ""}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>Unité</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Prix HT</Text>
            <Text style={[styles.tableHeaderText, styles.colVat]}>TVA</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total HT</Text>
          </View>

          {/* Rows */}
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colDescription}>
                <Text style={styles.tableCell}>{item.description}</Text>
                {item.service && (
                  <Text style={{ fontSize: 8, color: colors.text.muted, marginTop: 3 }}>
                    Service : {item.service.name}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>
                {item.unit || "unité"}
              </Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrency(item.unitPriceHt)}
              </Text>
              <Text style={[styles.tableCell, styles.colVat]}>{item.vatRate}%</Text>
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
              <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotalHt)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.taxAmount)}</Text>
            </View>
            {invoice.discountAmount && invoice.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Remise</Text>
                <Text style={[styles.totalsValue, { color: colors.success }]}>
                  -{formatCurrency(invoice.discountAmount)}
                </Text>
              </View>
            )}
            <View style={styles.totalsDivider} />
            <View style={styles.totalsFinal}>
              <Text style={styles.totalsFinalLabel}>Total TTC</Text>
              <Text style={styles.totalsFinalValue}>
                {formatCurrency(invoice.totalTtc)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Payment Info */}
          {(settings.bankName || settings.iban || settings.bic) && (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Informations de paiement</Text>
              {settings.bankName && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Banque</Text>
                  <Text style={styles.paymentValue}>{settings.bankName}</Text>
                </View>
              )}
              {settings.iban && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>IBAN</Text>
                  <Text style={styles.paymentValue}>{settings.iban}</Text>
                </View>
              )}
              {settings.bic && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>BIC</Text>
                  <Text style={styles.paymentValue}>{settings.bic}</Text>
                </View>
              )}
              {settings.paymentTerms && (
                <View style={[styles.paymentRow, { marginTop: 8 }]}>
                  <Text style={styles.paymentValue}>
                    Conditions : Paiement à {settings.paymentTerms} jours
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Notes */}
          {invoice.notes && (
            <View style={styles.notes}>
              <Text>Notes : {invoice.notes}</Text>
            </View>
          )}

          {/* Legal */}
          <Text style={styles.legal}>
            {settings.invoiceFooter || ""}
            {settings.lateFee
              ? `\nEn cas de retard de paiement, une pénalité de ${settings.lateFee}% sera appliquée.`
              : ""}
            {"\n\n"}
            Document généré par Aurora CRM
          </Text>
        </View>
      </Page>
    </Document>
  )
}
