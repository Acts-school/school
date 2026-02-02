import { ensurePermission } from "@/lib/authz";
import prisma from "@/lib/prisma";
import { ThermalReceipt } from "@/components/finance/ThermalReceipt";
import { PrintReceiptToolbar } from "@/components/finance/PrintReceiptToolbar";

type RouteParams = {
  paymentId: string | string[] | undefined;
};

type PageProps = {
  params?: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export default async function ReceiptPrintPage({ params }: PageProps) {
  await ensurePermission("fees.read");

  const resolvedParams = params ? await params : { paymentId: undefined };
  const paymentIdRaw = toSingleValue(resolvedParams.paymentId);

  if (!paymentIdRaw) {
    return (
      <div className="p-4 text-sm text-red-600">Missing payment id.</div>
    );
  }

  const paymentIdNumber = Number.parseInt(paymentIdRaw, 10);

  if (!Number.isFinite(paymentIdNumber) || paymentIdNumber <= 0) {
    return (
      <div className="p-4 text-sm text-red-600">Invalid payment id.</div>
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentIdNumber },
    include: {
      studentFee: {
        select: {
          amountDue: true,
          amountPaid: true,
          term: true,
          academicYear: true,
          student: {
            select: {
              username: true,
              name: true,
              surname: true,
              class: { select: { name: true } },
              grade: { select: { level: true } },
            },
          },
        },
      },
    },
  });

  if (!payment || !payment.studentFee || !payment.studentFee.student) {
    return (
      <div className="p-4 text-sm text-red-600">Payment not found.</div>
    );
  }

  const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
  const schoolName = settings?.schoolName ?? "School";

  const fee = payment.studentFee;
  const academicYear = fee.academicYear ?? settings?.currentAcademicYear ?? null;
  const term = fee.term ?? settings?.currentTerm ?? null;

  const totalAmountMinor = fee.amountDue ?? payment.amount;
  const paidAmountMinor = fee.amountPaid ?? payment.amount;
  const balanceMinor = Math.max((fee.amountDue ?? 0) - (fee.amountPaid ?? 0), 0);

  const termLabel = (() => {
    if (!term) return null;
    if (term === "TERM1") return "Term 1";
    if (term === "TERM2") return "Term 2";
    if (term === "TERM3") return "Term 3";
    return String(term);
  })();

  const student = fee.student;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          body {
            font-family: monospace;
            font-size: 12px;
          }

          .no-print {
            display: none;
          }
        }

        body {
          margin: 0;
        }
      `}</style>
      <PrintReceiptToolbar />
      <ThermalReceipt
        schoolName={schoolName}
        receiptId={payment.id}
        paymentAmountMinor={payment.amount}
        totalAmountMinor={totalAmountMinor}
        paidAmountMinor={paidAmountMinor}
        balanceMinor={balanceMinor}
        method={payment.method}
        reference={payment.reference ?? null}
        paidAt={payment.paidAt}
        studentName={`${student.name} ${student.surname}`}
        studentUsername={student.username}
        className={student.class?.name ?? null}
        gradeLevel={student.grade?.level ?? null}
        academicYear={academicYear}
        termLabel={termLabel}
      />
    </>
  );
}
