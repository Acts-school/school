import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import prisma from "@/lib/prisma";
import { PrintReceiptToolbar } from "@/components/finance/PrintReceiptToolbar";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type PaymentRow = {
  id: number;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: Date;
};

type StudentFeeRow = {
  id: string;
  term: TermLiteral | null;
  academicYear: number | null;
  amountDue: number;
  amountPaid: number;
  status: string;
  structure: { id: number; name: string } | null;
  feeCategory: { id: number; name: string } | null;
  dueDate: Date | null;
  createdAt: Date;
  payments: PaymentRow[];
};

type StudentFeeFindManyArgs = {
  where: {
    studentId: string;
    academicYear?: number;
    term?: TermLiteral;
  };
  select: {
    id: true;
    term: true;
    academicYear: true;
    amountDue: true;
    amountPaid: true;
    status: true;
    structure: { select: { id: true; name: true } } | null;
    feeCategory: { select: { id: true; name: true } } | null;
    dueDate: true;
    createdAt: true;
    payments: {
      select: {
        id: true;
        amount: true;
        method: true;
        reference: true;
        paidAt: true;
      };
    };
  };
  orderBy: { createdAt: "asc" };
};

type FinancePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
  };
};

type StudentHeader = {
  id: string;
  name: string;
  surname: string;
  class: { id: number; name: string } | null;
  grade: { id: number; level: number } | null;
};

type StudentFindUniqueArgs = {
  where: { id: string };
  select: {
    id: true;
    name: true;
    surname: true;
    class: { select: { id: true; name: true } };
    grade: { select: { id: true; level: true } };
  };
};

type StatementPrisma = FinancePrisma & {
  student: {
    findUnique: (args: StudentFindUniqueArgs) => Promise<StudentHeader | null>;
  };
};

type RouteParams = {
  studentId: string | string[] | undefined;
};

type PageProps = {
  params?: Promise<RouteParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export const dynamic = "force-dynamic";

export default async function StudentStatementPrintPage({
  params,
  searchParams,
}: PageProps) {
  await ensurePermission("fees.read");

  const resolvedParams = params ? await params : { studentId: undefined };
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const studentId = toSingleValue(resolvedParams.studentId);

  if (!studentId) {
    return <div className="p-4 text-sm text-red-600">Missing student id.</div>;
  }

  const { academicYear: defaultYear, term: defaultTerm } = await getSchoolSettingsDefaults();

  const year = (() => {
    const raw = toSingleValue(resolvedSearchParams.year);
    if (!raw) return defaultYear;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  const term: TermLiteral | null = (() => {
    const raw = toSingleValue(resolvedSearchParams.term);
    if (raw === "TERM1" || raw === "TERM2" || raw === "TERM3") return raw;
    return defaultTerm;
  })();

  const generatedAt = new Date();

  const statementPrisma = prisma as unknown as StatementPrisma;

  const [student, fees] = await Promise.all([
    statementPrisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        surname: true,
        class: { select: { id: true, name: true } },
        grade: { select: { id: true, level: true } },
      },
    }),
    (statementPrisma as FinancePrisma).studentFee.findMany({
      where: {
        studentId,
        academicYear: year,
        ...(term ? { term } : {}),
      },
      select: {
        id: true,
        term: true,
        academicYear: true,
        amountDue: true,
        amountPaid: true,
        status: true,
        structure: { select: { id: true, name: true } },
        feeCategory: { select: { id: true, name: true } },
        dueDate: true,
        createdAt: true,
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            reference: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!student) {
    return <div className="p-4 text-sm text-red-600">Student not found.</div>;
  }

  let totalDue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  for (const fee of fees) {
    totalDue += fee.amountDue;
    totalPaid += fee.amountPaid;
    totalOutstanding += Math.max(fee.amountDue - fee.amountPaid, 0);
  }

  const termLabel = (() => {
    if (!term) return "All terms";
    if (term === "TERM1") return "Term 1";
    if (term === "TERM2") return "Term 2";
    if (term === "TERM3") return "Term 3";
    return term;
  })();

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background-color: white;
          }

          .no-print {
            display: none;
          }
        }
      `}</style>
      <PrintReceiptToolbar />
      <div className="p-4 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold">Student Fee Statement</h1>
          <div className="text-sm text-gray-700">
            <div>
              <span className="font-semibold">Student:</span> {student.name} {student.surname}
            </div>
            <div>
              <span className="font-semibold">Class:</span> {student.class?.name ?? "-"}
            </div>
            <div>
              <span className="font-semibold">Grade:</span> {student.grade?.level ?? "-"}
            </div>
            <div>
              <span className="font-semibold">Year:</span> {year}
            </div>
            <div>
              <span className="font-semibold">Term scope:</span> {termLabel}
            </div>
            <div>
              <span className="font-semibold">Generated on:</span> {generatedAt.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-md ring-1 ring-gray-200 text-sm">
            <div className="text-xs text-gray-500">Total Due</div>
            <div className="text-lg font-semibold">{formatKES(totalDue)}</div>
          </div>
          <div className="p-3 rounded-md ring-1 ring-gray-200 text-sm">
            <div className="text-xs text-gray-500">Total Paid</div>
            <div className="text-lg font-semibold">{formatKES(totalPaid)}</div>
          </div>
          <div className="p-3 rounded-md ring-1 ring-gray-200 text-sm">
            <div className="text-xs text-gray-500">Outstanding / Arrears</div>
            <div className="text-lg font-semibold">{formatKES(totalOutstanding)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Term</th>
                <th className="py-2 pr-4">Fee</th>
                <th className="py-2 pr-4">Due</th>
                <th className="py-2 pr-4">Paid</th>
                <th className="py-2 pr-4">Outstanding</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const outstanding = Math.max(fee.amountDue - fee.amountPaid, 0);
                const feeName = fee.structure?.name ?? fee.feeCategory?.name ?? "-";
                const termValue = fee.term ?? "TERM1";
                return (
                  <tr key={fee.id} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {new Date(fee.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-xs">{termValue}</td>
                    <td className="py-2 pr-4">{feeName}</td>
                    <td className="py-2 pr-4">{formatKES(fee.amountDue)}</td>
                    <td className="py-2 pr-4">{formatKES(fee.amountPaid)}</td>
                    <td className="py-2 pr-4">{formatKES(outstanding)}</td>
                    <td className="py-2 pr-4 text-xs uppercase">{fee.status}</td>
                  </tr>
                );
              })}
              {fees.length === 0 && (
                <tr>
                  <td className="py-4 pr-4 text-sm text-gray-500" colSpan={7}>
                    No fees found for this student in {year} for the selected scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
