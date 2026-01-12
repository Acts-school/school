import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { PaymentMethod } from "@prisma/client";

export type ReceiptDocumentProps = {
  schoolName: string;
  payment: {
    id: number;
    amountMinor: number;
    method: PaymentMethod;
    reference: string | null;
    paidAt: Date;
  };
  student: {
    name: string;
    surname: string;
    username: string;
    className: string | null;
    gradeLevel: number | null;
  };
  academicYear?: number | null;
  termLabel?: string | null;
  totalAmountMinor?: number | null;
  paidAmountMinor?: number | null;
  balanceMinor?: number | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 11,
  },
  header: {
    marginBottom: 16,
  },
  schoolName: {
    fontSize: 16,
    marginBottom: 4,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontWeight: "bold",
  },
});

const compactStyles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 9,
    fontFamily: "Courier",
  },
  line: {
    marginBottom: 2,
  },
  divider: {
    marginVertical: 4,
  },
  header: {
    marginBottom: 4,
    alignItems: "center",
  },
  schoolName: {
    fontSize: 11,
    fontWeight: "bold",
  },
  sectionTitle: {
    marginBottom: 2,
    fontWeight: "bold",
  },
});

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const formatAmountLine = (label: string, minor: number, width = 32): string => {
  const value = ((minor ?? 0) / 100).toFixed(2);
  const left = label;
  const right = value;
  const spaceCount = Math.max(width - left.length - right.length, 1);
  return `${left}${" ".repeat(spaceCount)}${right}`;
};

export const ReceiptDocument = ({
  schoolName,
  payment,
  student,
  academicYear,
  termLabel,
  totalAmountMinor,
  paidAmountMinor,
  balanceMinor,
}: ReceiptDocumentProps): ReactElement => {
  const paidDate = payment.paidAt instanceof Date ? payment.paidAt : new Date(payment.paidAt);

  const effectiveTotalMinor = totalAmountMinor ?? payment.amountMinor;
  const effectivePaidMinor = paidAmountMinor ?? payment.amountMinor;
  const effectiveBalanceMinor =
    balanceMinor ?? Math.max(effectiveTotalMinor - effectivePaidMinor, 0);

  const termYearLine = termLabel || academicYear
    ? `Term: ${termLabel ?? "-"}  |  Year: ${academicYear ?? "-"}`
    : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text>Payment Receipt</Text>
        </View>

        <View style={styles.section}>
          <Text>
            <Text style={styles.label}>Receipt # </Text>
            {String(payment.id)}
          </Text>
          <Text>
            <Text style={styles.label}>Date: </Text>
            {paidDate.toLocaleString()}
          </Text>
          {termYearLine ? (
            <Text>
              <Text style={styles.label}>Term/Year: </Text>
              {termYearLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Student details</Text>
          <Text>
            {student.name} {student.surname} ({student.username})
          </Text>
          <Text>
            Class: {student.className ?? "-"} · Grade: {student.gradeLevel ?? "-"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment details</Text>
          <Text>Amount: {formatKES(payment.amountMinor)}</Text>
          <Text>Method: {payment.method}</Text>
          {payment.reference ? <Text>Reference: {payment.reference}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Totals</Text>
          <Text>Total: {formatKES(effectiveTotalMinor)}</Text>
          <Text>Paid: {formatKES(effectivePaidMinor)}</Text>
          <Text>Balance: {formatKES(effectiveBalanceMinor)}</Text>
        </View>

        <View style={styles.section}>
          <Text>This is a system-generated receipt for school fee payment.</Text>
        </View>
      </Page>
    </Document>
  );
};

export const CompactReceiptDocument = ({
  schoolName,
  payment,
  student,
  academicYear,
  termLabel,
  totalAmountMinor,
  paidAmountMinor,
  balanceMinor,
}: ReceiptDocumentProps): ReactElement => {
  const paidDate = payment.paidAt instanceof Date ? payment.paidAt : new Date(payment.paidAt);

  const termYearLine = termLabel || academicYear
    ? `TERM: ${termLabel ?? "-"}  |  ${academicYear ?? "-"}`
    : undefined;

  return (
    <Document>
      <Page size={[226.77, 600]} style={compactStyles.page}>
        <View style={compactStyles.header}>
          <Text style={compactStyles.schoolName}>{schoolName}</Text>
        </View>
        <View>
          <Text style={compactStyles.line}>RECEIPT NO: {String(payment.id).padStart(6, "0")}</Text>
          <Text style={compactStyles.line}>DATE: {paidDate.toLocaleString()}</Text>
          {termYearLine ? <Text style={compactStyles.line}>{termYearLine}</Text> : null}
          <Text style={compactStyles.line}>PAYMENT: {payment.method}</Text>
          {payment.reference ? (
            <Text style={compactStyles.line}>REF: {payment.reference}</Text>
          ) : null}
          <Text style={compactStyles.divider}>------------------------------</Text>
          <Text style={compactStyles.sectionTitle}>STUDENT DETAILS</Text>
          <Text style={compactStyles.line}>
            Name : {student.name} {student.surname}
          </Text>
          <Text style={compactStyles.line}>Adm  : {student.username}</Text>
          <Text style={compactStyles.line}>Class: {student.className ?? "-"}</Text>
          <Text style={compactStyles.line}>Grade: {student.gradeLevel ?? "-"}</Text>
          <Text style={compactStyles.divider}>------------------------------</Text>
          <Text style={compactStyles.sectionTitle}>TOTALS</Text>
          <Text style={compactStyles.line}>
            {formatAmountLine("TOTAL", totalAmountMinor ?? payment.amountMinor)}
          </Text>
          <Text style={compactStyles.line}>
            {formatAmountLine("PAID", paidAmountMinor ?? payment.amountMinor)}
          </Text>
          <Text style={compactStyles.line}>
            {formatAmountLine(
              "BALANCE",
              balanceMinor ?? Math.max((totalAmountMinor ?? payment.amountMinor) - (paidAmountMinor ?? payment.amountMinor), 0),
            )}
          </Text>
          <Text style={compactStyles.divider}>------------------------------</Text>
          <Text style={compactStyles.line}>Thank you for your payment</Text>
          <Text style={compactStyles.line}>Keep this receipt safe</Text>
          <Text style={compactStyles.divider}>------------------------------</Text>
        </View>
      </Page>
    </Document>
  );
};
