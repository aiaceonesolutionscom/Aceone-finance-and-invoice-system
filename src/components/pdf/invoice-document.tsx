import { Document, Page, Text, View, StyleSheet, Image, Svg, Path, Polygon } from "@react-pdf/renderer";
import type { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { formatMoney, money, sumMoney } from "@/lib/money";

// Brand Color Palette (AceOne Burgundy & Crimson Identity)
const BRAND_PRIMARY = "#780028"; // Rich Deep Burgundy
const BRAND_CRIMSON = "#9E0038"; // Vivid Crimson / Accent
const BRAND_DARK = "#110B14"; // Dark Plum / Footer Band
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const BORDER_COLOR = "#E5E7EB";
const CARD_BG = "#FFF1F2"; // Soft rose/pink card background
const ROW_ALT = "#FBFBFB";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

const statusColors: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "#DCFCE7", fg: "#166534" },
  "PARTIALLY PAID": { bg: "#FEF3C7", fg: "#92400E" },
  UNPAID: { bg: "#FEE2E2", fg: "#991B1B" },
};

function UserIcon() {
  return (
    <Svg width="11" height="11" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <Path
        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
        fill="#9E0038"
      />
    </Svg>
  );
}

function BuildingIcon() {
  return (
    <Svg width="11" height="11" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <Path
        d="M4 2v20h8V7h8v15h2V5h-8V2H4zm2 2h4v2H6V4zm0 4h4v2H6V8zm0 4h4v2H6v-2zm0 4h4v2H6v-2zm8-7h4v2h-4v-2zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2z"
        fill="#9E0038"
      />
    </Svg>
  );
}

function BankIcon() {
  return (
    <Svg width="11" height="11" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <Path
        d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
        fill="#9E0038"
      />
    </Svg>
  );
}

function NotesIcon() {
  return (
    <Svg width="11" height="11" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
      <Path
        d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
        fill="#9E0038"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 65,
    paddingHorizontal: 36,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
    backgroundColor: "#FFFFFF",
  },
  // Top Header Area
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cornerAccent: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  logoBox: {
    maxWidth: 210,
  },
  logo: {
    width: 170,
    height: 52,
    objectFit: "contain",
  },
  taglineSub: {
    fontSize: 6.5,
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
  headerRightBox: {
    maxWidth: 240,
    alignItems: "flex-end",
    position: "relative",
  },
  partnerLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 2,
    textAlign: "right",
  },
  partnerTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: BRAND_PRIMARY,
    marginBottom: 4,
    textAlign: "right",
  },
  partnerDesc: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    lineHeight: 1.4,
    textAlign: "right",
    maxWidth: 210,
  },
  // 3-Column Info Section
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },
  infoColBillTo: {
    flex: 1.1,
  },
  infoColFrom: {
    flex: 1.2,
  },
  infoColInvoice: {
    flex: 1.1,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: BRAND_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  entityName: {
    fontSize: 10,
    fontWeight: 700,
    color: TEXT_DARK,
    marginBottom: 3,
  },
  entityDetail: {
    fontSize: 8,
    color: TEXT_MUTED,
    lineHeight: 1.45,
  },
  ntnBadge: {
    fontSize: 8,
    fontWeight: 700,
    color: BRAND_PRIMARY,
    marginTop: 3,
  },
  // Invoice Details Box
  invoiceCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 6,
    padding: 10,
  },
  invoiceCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: BRAND_PRIMARY,
    letterSpacing: 1,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 8,
    fontWeight: 700,
    color: TEXT_DARK,
  },
  // Table Styles
  table: {
    marginBottom: 14,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: ROW_ALT,
  },
  colIndex: {
    width: 28,
    color: TEXT_MUTED,
    fontSize: 8,
  },
  colDesc: {
    flex: 4,
    paddingRight: 10,
  },
  colRate: {
    flex: 1.5,
    textAlign: "right",
    color: TEXT_MUTED,
    fontSize: 8,
  },
  colAmount: {
    flex: 1.5,
    textAlign: "right",
    fontWeight: 700,
    color: TEXT_DARK,
    fontSize: 8.5,
  },
  serviceName: {
    fontSize: 8.5,
    fontWeight: 700,
    color: TEXT_DARK,
  },
  // Middle Layout: Terms + Financial Summary
  midSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 14,
  },
  totalsBox: {
    width: 240,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
  },
  totalsLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  totalsValue: {
    fontSize: 8,
    color: TEXT_DARK,
    fontWeight: 700,
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    marginVertical: 4,
  },
  grandTotalBar: {
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  grandTotalLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 700,
  },
  amberText: {
    color: "#92400E",
    fontWeight: 700,
  },
  // Bottom Sections (Payment Details & History & Notes)
  bottomGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },
  bankBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    padding: 10,
  },
  paymentHistoryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    padding: 10,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    fontSize: 7.5,
    fontWeight: 700,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    fontSize: 7.5,
  },
  notesBox: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    padding: 9,
    marginBottom: 10,
  },
  // Dark Bottom Strip
  footerBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#5A001D", // Rich Deep Burgundy
    borderTopWidth: 2.5,
    borderTopColor: "#E11D48", // Vivid Crimson accent line
    paddingVertical: 12,
    paddingHorizontal: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerColLeft: {
    flex: 1,
    paddingRight: 20,
  },
  footerContacts: {
    fontSize: 8.5,
    color: "#FFFFFF",
    marginBottom: 3.5,
    lineHeight: 1.35,
  },
  footerLabel: {
    color: "#FECDD3", // Crisp light rose label
    fontWeight: 700,
  },
  footerValue: {
    color: "#FFFFFF", // Pure white for crystal clear readability
  },
  footerSep: {
    color: "#FB7185", // Crimson/rose dot
  },
  footerAddress: {
    color: "#FFFFFF", // Pure white for crystal clarity
    fontSize: 7.8,
    lineHeight: 1.4,
    opacity: 0.95,
  },
});

type Invoice = typeof invoices.$inferSelect;
type InvoiceItem = typeof invoiceItems.$inferSelect;
type Payment = typeof payments.$inferSelect & {
  siblingInvoices?: { invoiceNumber: string; amount: string }[];
};

export function InvoiceDocument({
  invoice,
  items,
  invoicePayments,
  logoAbsolutePath,
  whiteLogoAbsolutePath,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  invoicePayments: Payment[];
  logoAbsolutePath: string | null;
  whiteLogoAbsolutePath?: string | null;
}) {
  const paid = sumMoney(invoicePayments.map((p) => p.amount));
  const remaining = money(invoice.currentInvoiceTotal).minus(paid);
  const status = remaining.lte(0) ? "PAID" : paid.gt(0) ? "PARTIALLY PAID" : "UNPAID";
  const statusColor = statusColors[status];
  const company = invoice.companySnapshot;
  const customer = invoice.customerSnapshot;
  const additionalTexts = invoice.additionalTextSnapshot ?? [];
  const includedPreviousOutstanding = Number(invoice.totalAmountDue) > Number(invoice.currentInvoiceTotal);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top-Right Corner Geometric Accent (Flush with top-right page edges) */}
        <View style={styles.cornerAccent} fixed>
          <Svg width="110" height="70" viewBox="0 0 110 70">
            {/* Angled Crimson Stripe */}
            <Polygon points="32,0 46,0 18,52 4,52" fill="#BE123C" />
            {/* Corner Burgundy Polygon flush to top and right edges */}
            <Polygon points="58,0 110,0 110,70 20,70" fill="#780028" />
          </Svg>
        </View>

        {/* Top Header Section */}
        <View style={styles.topBar}>
          <View style={styles.logoBox}>
            {logoAbsolutePath ? (
              <Image src={logoAbsolutePath} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: 700, color: BRAND_PRIMARY }}>
                {company.companyName ?? "ACEONE CREATIVE AGENCY"}
              </Text>
            )}
            <Text style={styles.taglineSub}>Ideas  •  Design  •  Technology  •  Growth</Text>
          </View>

          {/* Tagline text with vertical red line on left */}
          <View style={{ borderLeftWidth: 2, borderLeftColor: "#E11D48", paddingLeft: 8, maxWidth: 175, paddingTop: 1, marginRight: 50 }}>
            <Text style={{ fontSize: 7.5, color: "#374151", marginBottom: 2 }}>Your Partner in</Text>
            <Text style={{ fontSize: 11, fontWeight: 700, color: "#9E0038", marginBottom: 3 }}>
              Digital Transformation
            </Text>
            <Text style={{ fontSize: 6.8, color: "#6B7280", lineHeight: 1.35 }}>
              We build modern solutions for a smarter, faster and more connected future.
            </Text>
          </View>
        </View>

        {/* 3-Column Meta Info Bar (Bill To, From / NTN, Invoice Card) */}
        <View style={styles.infoRow}>
          {/* Bill To */}
          <View style={styles.infoColBillTo}>
            <View style={styles.sectionTitleRow}>
              <UserIcon />
              <Text style={styles.sectionTitle}>Bill To</Text>
            </View>
            <Text style={styles.entityName}>{customer.customerName}</Text>
            {customer.companyName ? <Text style={styles.entityDetail}>{customer.companyName}</Text> : null}
            {customer.email ? <Text style={styles.entityDetail}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={styles.entityDetail}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={styles.entityDetail}>{customer.address}</Text> : null}
          </View>

          {/* From */}
          <View style={styles.infoColFrom}>
            <View style={styles.sectionTitleRow}>
              <BuildingIcon />
              <Text style={styles.sectionTitle}>From</Text>
            </View>
            <Text style={styles.entityName}>{company.companyName ?? "AceOne Creative Agency"}</Text>
            {company.phone ? <Text style={styles.entityDetail}>{company.phone}</Text> : null}
            {company.email ? <Text style={styles.entityDetail}>{company.email}</Text> : null}
            {company.website ? <Text style={styles.entityDetail}>{company.website}</Text> : null}
            {company.address ? <Text style={styles.entityDetail}>{company.address}</Text> : null}
            {company.companyTaxNumber ? (
              <Text style={styles.ntnBadge}>NTN / Tax ID: {company.companyTaxNumber}</Text>
            ) : null}
          </View>

          {/* Invoice Card */}
          <View style={styles.infoColInvoice}>
            <View style={styles.invoiceCard}>
              <Text style={styles.invoiceCardTitle}>INVOICE</Text>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Invoice No:</Text>
                <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Issue Date:</Text>
                <Text style={styles.metaValue}>{invoice.invoiceDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Terms:</Text>
                <Text style={styles.metaValue}>{invoice.paymentTermsSnapshot || "On Receipt"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Services & Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colIndex, styles.tableHeaderText]}>#</Text>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colRate, styles.tableHeaderText]}>Rate (PKR)</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount (PKR)</Text>
          </View>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <Text style={styles.colIndex}>{i + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.serviceName}>{item.serviceNameSnapshot}</Text>
              </View>
              <Text style={styles.colRate}>{formatMoney(item.rate, "")}</Text>
              <Text style={styles.colAmount}>{formatMoney(item.total, "")}</Text>
            </View>
          ))}
        </View>

        {/* Middle Section: Financial Summary */}
        <View style={styles.midSection}>
          {/* Financial Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoney(invoice.subtotal)}</Text>
            </View>
            {Number(invoice.discount) > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={styles.totalsValue}>- {formatMoney(invoice.discount)}</Text>
              </View>
            ) : null}
            {invoice.taxNameSnapshot ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  {invoice.taxNameSnapshot} ({invoice.taxRateSnapshot}%)
                </Text>
                <Text style={styles.totalsValue}>{formatMoney(invoice.taxAmount)}</Text>
              </View>
            ) : null}
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsLabel, { fontWeight: 700, color: TEXT_DARK }]}>
                Current Invoice Total
              </Text>
              <Text style={[styles.totalsValue, { color: BRAND_PRIMARY }]}>
                {formatMoney(invoice.currentInvoiceTotal)}
              </Text>
            </View>
            {includedPreviousOutstanding ? (
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, styles.amberText]}>Previous Outstanding</Text>
                <Text style={[styles.totalsValue, styles.amberText]}>
                  {formatMoney(invoice.previousOutstandingAmount)}
                </Text>
              </View>
            ) : null}
            <View style={styles.grandTotalBar}>
              <Text style={styles.grandTotalLabel}>Grand Total Due</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(invoice.totalAmountDue)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Grid: Payment Details / Bank Info & Payment History */}
        <View style={styles.bottomGrid}>
          {/* Bank / Payment Details */}
          <View style={styles.bankBox}>
            <View style={styles.sectionTitleRow}>
              <BankIcon />
              <Text style={styles.sectionTitle}>Payment Details (Bank Info)</Text>
            </View>
            {company.bankDetails ? (
              company.bankDetails
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, idx) => (
                  <Text key={idx} style={styles.entityDetail}>
                    {line}
                  </Text>
                ))
            ) : (
              <Text style={styles.entityDetail}>
                Bank transfer details available upon request. Contact {company.email || "info@aceonesolutions.com"}.
              </Text>
            )}
          </View>

          {/* Payment History & Status */}
          <View style={styles.paymentHistoryBox}>
            <View style={styles.historyHeader}>
              <View style={styles.sectionTitleRow}>
                <BankIcon />
                <Text style={styles.sectionTitle}>Payment History & Balance</Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor.bg, color: statusColor.fg },
                ]}
              >
                {status}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>
                Paid: <Text style={{ fontWeight: 700, color: "#166534" }}>{formatMoney(paid)}</Text>
              </Text>
              <Text style={{ fontSize: 7.5, color: TEXT_MUTED }}>
                Remaining: <Text style={{ fontWeight: 700, color: remaining.gt(0) ? "#991B1B" : "#166534" }}>{formatMoney(remaining)}</Text>
              </Text>
            </View>

            {invoicePayments.length > 0 ? (
              <View>
                {invoicePayments.slice(0, 3).map((p) => (
                  <View key={p.id} style={styles.historyRow}>
                    <Text style={{ color: TEXT_MUTED }}>{p.paymentDate}</Text>
                    <Text style={{ color: TEXT_DARK }}>{methodLabels[p.paymentMethod] ?? p.paymentMethod}</Text>
                    <Text style={{ fontWeight: 700, color: TEXT_DARK }}>{formatMoney(p.amount)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}>
                No payments recorded yet.
              </Text>
            )}
          </View>
        </View>

        {/* Notes & Additional Texts */}
        {additionalTexts.length > 0 ? (
          <View style={styles.notesBox}>
            <View style={[styles.sectionTitleRow, { marginBottom: 4 }]}>
              <NotesIcon />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            {additionalTexts.map((t, idx) => (
              <View key={idx} style={{ marginBottom: idx < additionalTexts.length - 1 ? 4 : 0 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: BRAND_PRIMARY }}>{t.title}:</Text>
                <Text style={{ fontSize: 7.5, color: TEXT_MUTED, lineHeight: 1.4 }}>{t.content}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Dark Footer Band with Burgundy & Crimson Theme */}
        <View style={styles.footerBand} fixed>
          <View style={styles.footerColLeft}>
            <Text style={styles.footerContacts}>
              {company.phone ? (
                <>
                  <Text style={styles.footerLabel}>Phone: </Text>
                  <Text style={styles.footerValue}>{company.phone}</Text>
                  <Text style={styles.footerSep}>   •   </Text>
                </>
              ) : null}
              {company.email ? (
                <>
                  <Text style={styles.footerLabel}>Email: </Text>
                  <Text style={styles.footerValue}>{company.email}</Text>
                  <Text style={styles.footerSep}>   •   </Text>
                </>
              ) : null}
              <Text style={styles.footerLabel}>Web: </Text>
              <Text style={styles.footerValue}>{company.website || "https://aceonesolutions.com"}</Text>
            </Text>
            {company.address ? (
              <Text style={styles.footerAddress}>{company.address}</Text>
            ) : null}
          </View>
          {whiteLogoAbsolutePath ? (
            <Image src={whiteLogoAbsolutePath} style={{ width: 145, height: 38, objectFit: "contain" }} />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 9.5, fontWeight: 700, letterSpacing: 1 }}>
              ACEONE CREATIVE AGENCY
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
