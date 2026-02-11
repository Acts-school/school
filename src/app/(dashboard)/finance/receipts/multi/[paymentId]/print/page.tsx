import { ensurePermission } from "@/lib/authz";
import prisma from "@/lib/prisma";
import { PrintReceiptToolbar } from "@/components/finance/PrintReceiptToolbar";

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

type RouteParams = {
  paymentId: string | string[] | undefined;
};

type PageProps = {
  params?: Promise<RouteParams>;
};

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const formatTermLabel = (term: string | null | undefined): string | null => {
  if (!term) return null;
  if (term === "TERM1") return "Term 1";
  if (term === "TERM2") return "Term 2";
  if (term === "TERM3") return "Term 3";
  return String(term);
};

export const dynamic = "force-dynamic";

export default async function MultiReceiptPrintPage({ params }: PageProps) {
  await ensurePermission("fees.read");

  const resolvedParams = params ? await params : { paymentId: undefined };
  const paymentIdRaw = toSingleValue(resolvedParams.paymentId);

  if (!paymentIdRaw) {
    return <div className="p-4 text-sm text-red-600">Missing payment id.</div>;
  }

  const paymentIdNumber = Number.parseInt(paymentIdRaw, 10);

  if (!Number.isFinite(paymentIdNumber) || paymentIdNumber <= 0) {
    return <div className="p-4 text-sm text-red-600">Invalid payment id.</div>;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentIdNumber },
    include: {
      allocations: {
        include: {
          studentFee: {
            select: {
              id: true,
              amountDue: true,
              amountPaid: true,
              term: true,
              academicYear: true,
              feeCategory: { select: { name: true } },
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
      },
    },
  });

  if (!payment || payment.allocations.length === 0) {
    return <div className="p-4 text-sm text-red-600">Payment not found.</div>;
  }

  const [firstAllocation] = payment.allocations;
  const firstFee = firstAllocation?.studentFee;

  if (!firstFee || !firstFee.student) {
    return <div className="p-4 text-sm text-red-600">Payment not found.</div>;
  }

  const settings = await prisma.schoolSettings.findUnique({ where: { id: 1 } });
  const schoolName = settings?.schoolName ?? "School";

  const academicYear =
    firstFee.academicYear ?? settings?.currentAcademicYear ?? null;
  const termLabel = formatTermLabel(firstFee.term ?? settings?.currentTerm ?? null);

  const student = firstFee.student;

  const totalAllocatedMinor = payment.allocations.reduce((acc, allocation) => {
    return acc + allocation.amount;
  }, 0);

  const items = payment.allocations.map((allocation) => {
    const fee = allocation.studentFee;
    const name = fee?.feeCategory?.name ?? "Fee";
    return {
      id: allocation.id,
      label: name,
      amountMinor: allocation.amount,
    };
  });

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
      <div className="w-full max-w-xs mx-auto px-2 py-3">
        <div className="text-center mb-2">
          <div className="text-sm font-semibold leading-tight">{schoolName}</div>
          <div className="text-[10px]">Fee Payment Receipt</div>
        </div>

        <div className="text-[10px] mb-2">
          <div className="flex justify-between">
            <span>Receipt #</span>
            <span>{String(payment.id).padStart(6, "0")}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span>{payment.paidAt.toLocaleString()}</span>
          </div>
          {termLabel || academicYear ? (
            <div className="flex justify-between">
              <span>Term / Year</span>
              <span>
                {termLabel ?? "-"} {academicYear ? `· ${academicYear}` : ""}
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-dashed border-gray-400 my-1" />

        <div className="text-[10px] mb-2">
          <div className="font-semibold mb-1">Student</div>
          <div className="flex justify-between">
            <span>Name</span>
            <span>{`${student.name} ${student.surname}`}</span>
          </div>
          <div className="flex justify-between">
            <span>Adm</span>
            <span>{student.username}</span>
          </div>
          <div className="flex justify-between">
            <span>Class</span>
            <span>{student.class?.name ?? "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Grade</span>
            <span>{student.grade?.level ?? "-"}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-1" />

        <div className="text-[10px] mb-2">
          <div className="font-semibold mb-1">Payment</div>
          <div className="flex justify-between">
            <span>Amount</span>
            <span>{formatKES(payment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Method</span>
            <span>{payment.method}</span>
          </div>
          {payment.reference ? (
            <div className="flex justify-between">
              <span>Reference</span>
              <span>{payment.reference}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-dashed border-gray-400 my-1" />

        <div className="text-[10px] mb-2">
          <div className="font-semibold mb-1">Allocations</div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.label}</span>
              <span>{formatKES(item.amountMinor)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-400 my-1" />

        <div className="text-[10px] mb-2">
          <div className="font-semibold mb-1">Totals</div>
          <div className="flex justify-between">
            <span>Payment total</span>
            <span>{formatKES(payment.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Allocated</span>
            <span>{formatKES(totalAllocatedMinor)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-1" />

        <div className="text-[10px] text-center mt-1">
          <div>Thank you for your payment.</div>
          <div>Please keep this receipt for your records.</div>
        </div>
      </div>
    </>
  );
}
