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

type FinancePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
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
              <th className="py-2 pr-4">Payments</th>
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
                  <td className="py-2 pr-4">
                    {fee.payments.length === 0 ? (
                      <span className="text-xs text-gray-400">No payments</span>
                    ) : (
                      <div className="flex flex-col gap-1 text-xs">
                        {fee.payments.map((p) => (
                          <div key={p.id} className="flex flex-col">
                            <span>
                              {formatKES(p.amount)} · {p.method}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {new Date(p.paidAt).toLocaleString()} {p.reference ? `· ${p.reference}` : ""}
                              {" · "}
                              <a
                                href={`/api/receipts/${p.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 hover:underline"
                              >
                                Print receipt
                              </a>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {fees.length === 0 && (
              <tr>
                <td className="py-4 pr-4 text-sm text-gray-500" colSpan={8}>
                  No fees found for this student in {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
