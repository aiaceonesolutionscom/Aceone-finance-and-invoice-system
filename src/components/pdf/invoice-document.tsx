import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { formatMoney, money, sumMoney } from "@/lib/money";

const BRAND = "#7c3aed";
const BRAND_DARK = "#5b21b6";
const TEXT = "#1f1f1f";
const MUTED = "#6b6b6b";
const BORDER = "#e5e5e5";
const ROW_ALT = "#f7f5fb";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  OTHER: "Other",
};

const statusColors: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "#dcfce7", fg: "#166534" },
  "PARTIALLY PAID": { bg: "#fef3c7", fg: "#92400e" },
  UNPAID: { bg: "#fee2e2", fg: "#991b1b" },
};

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 60, paddingHorizontal: 0, fontSize: 10, fontFamily: "Helvetica", color: TEXT },
  headerBand: {
    backgroundColor: BRAND,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceTitle: { fontSize: 30, fontWeight: 700, color: "white", letterSpacing: 2 },
  logo: { width: 190, height: 70, objectFit: "contain" },
  companyBox: { alignItems: "flex-end", maxWidth: 260 },
  companyName: { fontSize: 13, fontWeight: 700, color: "white", marginBottom: 3, textAlign: "right" },
  companySmall: { fontSize: 8.5, color: "#ede9fe", lineHeight: 1.5, textAlign: "right" },
  content: { paddingHorizontal: 40, paddingTop: 24 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  metaLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 700, color: TEXT, marginBottom: 8 },
  billToBox: { alignItems: "flex-end", maxWidth: 240 },
  sectionLabel: { fontSize: 8, color: BRAND, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 },
  billToName: { fontSize: 11, fontWeight: 700, marginBottom: 2, textAlign: "right" },
  small: { fontSize: 9, color: MUTED, lineHeight: 1.5 },
  smallRight: { fontSize: 9, color: MUTED, lineHeight: 1.5, textAlign: "right" },
  table: { marginBottom: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: BRAND_DARK, paddingVertical: 7, paddingHorizontal: 10 },
  tableHeaderText: { color: "white", fontSize: 9, fontWeight: 700, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10 },
  colIndex: { width: 24, color: MUTED },
  colService: { flex: 3 },
  colAmount: { flex: 1, textAlign: "right" },
  totalsWrap: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  totalsBox: { width: 230 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 6 },
  totalsRowShaded: { backgroundColor: ROW_ALT },
  totalsDivider: { borderTopWidth: 1, borderTopColor: BORDER, marginVertical: 2 },
  dueBox: { backgroundColor: BRAND, borderRadius: 3, padding: 10, marginTop: 6, flexDirection: "row", justifyContent: "space-between" },
  dueLabel: { color: "white", fontSize: 10, fontWeight: 700 },
  dueValue: { color: "white", fontSize: 13, fontWeight: 700 },
  amber: { color: "#92400e" },
  section: { marginTop: 22 },
  paymentSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 9, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  bold: { fontWeight: 700 },
  historyHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 4, marginBottom: 4 },
  historyHeaderText: { fontSize: 8, color: MUTED, textTransform: "uppercase" },
  additionalText: { marginBottom: 10 },
  footerBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND,
    paddingVertical: 14,
    fontSize: 10,
    fontWeight: 700,
    color: "white",
    textAlign: "center",
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
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  invoicePayments: Payment[];
  logoAbsolutePath: string | null;
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
        <View style={styles.headerBand}>
          {logoAbsolutePath ? (
            <Image src={logoAbsolutePath} style={styles.logo} />
          ) : (
            <Text style={styles.invoiceTitle}>INVOICE</Text>
          )}
          <View style={styles.companyBox}>
            <Text style={styles.companyName}>{company.companyName ?? "AceOne Creative Agency"}</Text>
            {company.address ? <Text style={styles.companySmall}>{company.address}</Text> : null}
            {company.phone ? <Text style={styles.companySmall}>{company.phone}</Text> : null}
            {company.email ? <Text style={styles.companySmall}>{company.email}</Text> : null}
            {company.website ? <Text style={styles.companySmall}>{company.website}</Text> : null}
            {company.companyTaxNumber ? <Text style={styles.companySmall}>Tax/NTN: {company.companyTaxNumber}</Text> : null}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
              <Text style={styles.metaLabel}>Date of Issue</Text>
              <Text style={styles.metaValue}>{invoice.invoiceDate}</Text>
            </View>
            <View style={styles.billToBox}>
              <Text style={styles.sectionLabel}>Bill To</Text>
              <Text style={styles.billToName}>{customer.customerName}</Text>
              {customer.companyName ? <Text style={styles.smallRight}>{customer.companyName}</Text> : null}
              {customer.email ? <Text style={styles.smallRight}>{customer.email}</Text> : null}
              {customer.phone ? <Text style={styles.smallRight}>{customer.phone}</Text> : null}
              {customer.address ? <Text style={styles.smallRight}>{customer.address}</Text> : null}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colIndex, styles.tableHeaderText]}>#</Text>
              <Text style={[styles.colService, styles.tableHeaderText]}>Description</Text>
              <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount</Text>
            </View>
            {items.map((item, i) => (
              <View key={item.id} style={i % 2 === 1 ? [styles.tableRow, styles.totalsRowShaded] : styles.tableRow}>
                <Text style={styles.colIndex}>{i + 1}</Text>
                <Text style={styles.colService}>{item.serviceNameSnapshot}</Text>
                <Text style={styles.colAmount}>{formatMoney(item.rate)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.totalsWrap, { justifyContent: "flex-end" }]}>
            <View style={styles.totalsBox}>
              <View style={[styles.totalsRow, styles.totalsRowShaded]}>
                <Text style={{ color: MUTED }}>Subtotal</Text>
                <Text>{formatMoney(invoice.subtotal)}</Text>
              </View>
              {Number(invoice.discount) > 0 ? (
                <View style={styles.totalsRow}>
                  <Text style={{ color: MUTED }}>Discount</Text>
                  <Text>{formatMoney(invoice.discount)}</Text>
                </View>
              ) : null}
              {invoice.taxNameSnapshot ? (
                <View style={[styles.totalsRow, styles.totalsRowShaded]}>
                  <Text style={{ color: MUTED }}>
                    {invoice.taxNameSnapshot} ({invoice.taxRateSnapshot}%)
                  </Text>
                  <Text>{formatMoney(invoice.taxAmount)}</Text>
                </View>
              ) : null}
              <View style={styles.totalsDivider} />
              <View style={styles.totalsRow}>
                <Text style={styles.bold}>Current Invoice Total</Text>
                <Text style={styles.bold}>{formatMoney(invoice.currentInvoiceTotal)}</Text>
              </View>
              {includedPreviousOutstanding ? (
                <View style={styles.totalsRow}>
                  <Text style={styles.amber}>Previous Outstanding</Text>
                  <Text style={styles.amber}>{formatMoney(invoice.previousOutstandingAmount)}</Text>
                </View>
              ) : null}
              <View style={styles.dueBox}>
                <Text style={styles.dueLabel}>Total Amount Due</Text>
                <Text style={styles.dueValue}>{formatMoney(invoice.totalAmountDue)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment Summary</Text>
            <View style={styles.paymentSummaryRow}>
              <View style={{ flexDirection: "row", gap: 24 }}>
                <View>
                  <Text style={{ color: MUTED, fontSize: 8 }}>TOTAL PAID</Text>
                  <Text style={styles.bold}>{formatMoney(paid)}</Text>
                </View>
                <View>
                  <Text style={{ color: MUTED, fontSize: 8 }}>REMAINING</Text>
                  <Text style={styles.bold}>{formatMoney(remaining)}</Text>
                </View>
              </View>
              <Text style={[styles.statusBadge, { backgroundColor: statusColor.bg, color: statusColor.fg }]}>
                {status}
              </Text>
            </View>

            {invoicePayments.length > 0 ? (
              <View>
                <View style={styles.historyHeaderRow}>
                  <Text style={[styles.historyHeaderText, { flex: 2 }]}>Date / Time</Text>
                  <Text style={[styles.historyHeaderText, { flex: 2 }]}>Method</Text>
                  <Text style={[styles.historyHeaderText, { flex: 1, textAlign: "right" }]}>Amount</Text>
                </View>
                {invoicePayments.map((p) => (
                  <View key={p.id} style={{ marginBottom: 4 }}>
                    <View style={styles.row}>
                      <Text style={{ flex: 2 }}>
                        {p.paymentDate} {p.paymentTime ? `— ${p.paymentTime}` : ""}
                      </Text>
                      <Text style={{ flex: 2 }}>{methodLabels[p.paymentMethod] ?? p.paymentMethod}</Text>
                      <Text style={{ flex: 1, textAlign: "right" }}>{formatMoney(p.amount)}</Text>
                    </View>
                    {p.siblingInvoices && p.siblingInvoices.length > 0 ? (
                      <Text style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>
                        This payment was recorded together with:{" "}
                        {p.siblingInvoices.map((s, i) => `${i > 0 ? ", " : ""}${s.invoiceNumber} (${formatMoney(s.amount)})`)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {invoice.paymentTermsSnapshot ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Payment Terms</Text>
              <Text style={styles.small}>{invoice.paymentTermsSnapshot}</Text>
            </View>
          ) : null}

          {additionalTexts.map((t, i) => (
            <View key={i} style={[styles.section, styles.additionalText]}>
              <Text style={styles.sectionLabel}>{t.title}</Text>
              <Text style={styles.small}>{t.content}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footerBand} fixed>
          {invoice.footerSnapshot || "Thank you for your business!"}
        </Text>
      </Page>
    </Document>
  );
}
