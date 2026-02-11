import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import prisma from "@/lib/prisma";
import Breadcrumbs from "@/components/Breadcrumbs";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type StudentHeader = {
  id: string;
  name: string;
  surname: string;
  class: { id: number; name: string } | null;
  grade: { id: number; level: number } | null;
};

type PaymentRow = {
  id: number;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: Date;
};

type PaymentAllocationRow = {
  id: number;
  amount: number;
  studentFee: {
    id: string;
    structure: { id: number; name: string } | null;
    feeCategory: { id: number; name: string } | null;
  } | null;
};

type PaymentHistoryRow = {
  id: number;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: Date;
  allocations: PaymentAllocationRow[];
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
    payments: { select: { id: true; amount: true; method: true; reference: true; paidAt: true } };
  };
  orderBy: { createdAt: "asc" };
};

type PaymentFindManyArgs = {
  where: {
    allocations: {
      some: {
        studentFee: {
          studentId: string;
          academicYear?: number;
          term?: TermLiteral;
        };
      };
    };
  };
  select: {
    id: true;
    amount: true;
    method: true;
    reference: true;
    paidAt: true;
    allocations: {
      select: {
        id: true;
        amount: true;
        studentFee: {
          select: {
            id: true;
            structure: { select: { id: true; name: true } };
            feeCategory: { select: { id: true; name: true } };
          };
        };
      };
    };
  };
  orderBy: { paidAt: "asc" };
};

type FinancePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
  };
  payment: {
    findMany: (args: PaymentFindManyArgs) => Promise<PaymentHistoryRow[]>;
  };
};

const financePrisma = prisma as unknown as FinancePrisma;
type StudentFeePageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const allTerms: TermLiteral[] = ["TERM1", "TERM2", "TERM3"];

type TermTotals = {
  due: number;
  paid: number;
  outstanding: number;
};
const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const dynamic = 'force-dynamic';

export default async function StudentFeeDetailPage({
  params,
  searchParams,
}: StudentFeePageProps) {
  await ensurePermission("fees.read");

  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const studentId = toSingleValue(resolvedParams.studentId);

  if (!studentId) {
    throw new Error("Missing studentId");
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

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      surname: true,
      class: { select: { id: true, name: true } },
      grade: { select: { id: true, level: true } },
    },
  });

  if (!student) {
    return (
      <div className="p-4">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Finance", href: "/finance/fees" },
            { label: "Student fees" },
          ]}
        />
        <div className="mt-6 text-sm text-red-600">Student not found.</div>
      </div>
    );
  }

  const fees = await financePrisma.studentFee.findMany({
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
  });

  const payments = await financePrisma.payment.findMany({
    where: {
      allocations: {
        some: {
          studentFee: {
            studentId,
            academicYear: year,
            ...(term ? { term } : {}),
          },
        },
      },
    },
    select: {
      id: true,
      amount: true,
      method: true,
      reference: true,
      paidAt: true,
      allocations: {
        select: {
          id: true,
          amount: true,
          studentFee: {
            select: {
              id: true,
              structure: { select: { id: true, name: true } },
              feeCategory: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { paidAt: "asc" },
  });

  const termTotals = new Map<TermLiteral, TermTotals>();
  const overall: TermTotals = { due: 0, paid: 0, outstanding: 0 };

  for (const t of allTerms) {
    termTotals.set(t, { due: 0, paid: 0, outstanding: 0 });
  }

  for (const fee of fees) {
    const termKey: TermLiteral = (fee.term ?? "TERM1") as TermLiteral;
    const bucket = termTotals.get(termKey);
    if (!bucket) continue;
    bucket.due += fee.amountDue;
    bucket.paid += fee.amountPaid;
    bucket.outstanding += Math.max(fee.amountDue - fee.amountPaid, 0);

    overall.due += fee.amountDue;
    overall.paid += fee.amountPaid;
    overall.outstanding += Math.max(fee.amountDue - fee.amountPaid, 0);
  }

  const yearParam = encodeURIComponent(String(year));
  const gradeIdParam = student.grade ? encodeURIComponent(String(student.grade.id)) : null;
  const classIdParam = student.class ? encodeURIComponent(String(student.class.id)) : null;

  const statementPrintUrl = (() => {
    const base = `/finance/statements/student/${encodeURIComponent(student.id)}/print`;
    const query = new URLSearchParams();
    query.set("year", String(year));
    if (term) {
      query.set("term", term);
    }
    const queryString = query.toString();
    return queryString ? `${base}?${queryString}` : base;
  })();

  const breadcrumbItems: Array<{ label: string; href?: string }> = [
    { label: "Dashboard", href: "/" },
    { label: "Finance", href: "/finance/fees" },
    { label: "Clearance", href: `/finance/clearance?year=${yearParam}` },
  ];

  if (gradeIdParam) {
    breadcrumbItems.push({
      label: `Grade ${student.grade?.level ?? ""}`.trim(),
      href: `/finance/clearance?year=${yearParam}&gradeId=${gradeIdParam}`,
    });
  }

  if (classIdParam) {
    const gradeQuery = gradeIdParam ? `&gradeId=${gradeIdParam}` : "";
    breadcrumbItems.push({
      label: `Class ${student.class?.name ?? ""}`.trim(),
      href: `/finance/clearance?year=${yearParam}${gradeQuery}&classId=${classIdParam}`,
    });
  }

  breadcrumbItems.push({ label: "Student fees" });

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {student.name} {student.surname}
        </h1>
        <div className="text-sm text-gray-600">
          <span>Class: {student.class?.name ?? "-"}</span>
          {" · "}
          <span>Grade: {student.grade?.level ?? "-"}</span>
          {" · "}
          <span>Year: {year}</span>
        </div>
      </div>

      <form
        method="get"
        className="flex items-end gap-2 text-sm w-full md:w-auto"
      >
        <div className="flex flex-col">
          <label className="text-xs text-gray-500" htmlFor="year-input">
            Academic year
          </label>
          <input
            id="year-input"
            name="year"
            defaultValue={String(year)}
            className="p-1.5 rounded-md ring-1 ring-gray-300 w-24 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500" htmlFor="term-select">
            Term
          </label>
          <select
            id="term-select"
            name="term"
            defaultValue={term ?? ""}
            className="p-1.5 rounded-md ring-1 ring-gray-300 w-32 text-sm"
          >
            <option value="">All terms</option>
            <option value="TERM1">TERM1</option>
            <option value="TERM2">TERM2</option>
            <option value="TERM3">TERM3</option>
          </select>
        </div>
        <button className="px-3 py-1.5 text-xs rounded-md bg-gray-800 text-white">
          Go
        </button>
        <a
          href={statementPrintUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-2 text-xs text-blue-600 hover:underline whitespace-nowrap"
        >
          Print statement
        </a>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {allTerms.map((t) => {
          const bucket = termTotals.get(t)!;
          return (
            <div key={t} className="p-4 rounded-md ring-1 ring-gray-200 text-sm">
              <div className="text-xs text-gray-500 mb-1">{t}</div>
              <div className="flex flex-col gap-1">
                <span>
                  <span className="font-semibold">Due:</span> {formatKES(bucket.due)}
                </span>
                <span>
                  <span className="font-semibold">Paid:</span> {formatKES(bucket.paid)}
                </span>
                <span>
                  <span className="font-semibold">Outstanding:</span> {formatKES(bucket.outstanding)}
                </span>
              </div>
            </div>
          );
        })}
        <div className="p-4 rounded-md ring-1 ring-gray-200 text-sm">
          <div className="text-xs text-gray-500 mb-1">All terms</div>
          <div className="flex flex-col gap-1">
            <span>
              <span className="font-semibold">Due:</span> {formatKES(overall.due)}
            </span>
            <span>
              <span className="font-semibold">Paid:</span> {formatKES(overall.paid)}
            </span>
            <span>
              <span className="font-semibold">Outstanding:</span> {formatKES(overall.outstanding)}
            </span>
          </div>
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
              return (
                <tr key={fee.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-4 text-xs text-gray-600">
                    {new Date(fee.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-xs">{fee.term ?? "TERM1"}</td>
                  <td className="py-2 pr-4">{fee.structure?.name ?? fee.feeCategory?.name ?? "-"}</td>
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
                  No fees found for this student in {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-2">Payment history</h2>
        {payments.length === 0 ? (
          <p className="text-xs text-gray-500">No payments recorded for this student in {year}.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Receipt</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Allocated to</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const allocationDescriptions = payment.allocations
                  .map((allocation) => {
                    if (!allocation.studentFee) {
                      return null;
                    }
                    const label =
                      allocation.studentFee.structure?.name ?? allocation.studentFee.feeCategory?.name ?? "Fee";
                    return `${label} (${formatKES(allocation.amount)})`;
                  })
                  .filter((value): value is string => value !== null);

                const allocatedTo = allocationDescriptions.join(" · ");

                return (
                  <tr key={payment.id} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {new Date(payment.paidAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      {String(payment.id).padStart(6, "0")}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </td>
                    <td className="py-2 pr-4 text-xs">{payment.method}</td>
                    <td className="py-2 pr-4">{formatKES(payment.amount)}</td>
                    <td className="py-2 pr-4 text-xs text-gray-700">
                      {allocatedTo || "-"}
                    </td>
                    <td className="py-2 pr-4 text-xs">
                      <a
                        href={`/finance/receipts/multi/${payment.id}/print`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Print receipt
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
