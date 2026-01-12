import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type DebtorsSearchParams = {
  term: "TERM1" | "TERM2" | "TERM3" | undefined;
  gradeId: string | undefined;
  classId: string | undefined;
  sort: "outstanding_desc" | "outstanding_asc" | undefined;
  page: string | undefined;
  pageSize: string | undefined;
};

type DebtorsPageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function DebtorsPage({ searchParams }: DebtorsPageProps) {
  await ensurePermission("fees.read");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const params: DebtorsSearchParams = {
    term: toSingleValue(resolvedSearchParams.term) as
      | "TERM1"
      | "TERM2"
      | "TERM3"
      | undefined,
    gradeId: toSingleValue(resolvedSearchParams.gradeId),
    classId: toSingleValue(resolvedSearchParams.classId),
    sort: toSingleValue(resolvedSearchParams.sort) as
      | "outstanding_desc"
      | "outstanding_asc"
      | undefined,
    page: toSingleValue(resolvedSearchParams.page),
    pageSize: toSingleValue(resolvedSearchParams.pageSize),
  };

  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const pageSize = Math.max(Math.min(parseInt(params.pageSize ?? "20", 10) || 20, 100), 1);
  const sort = params.sort ?? "outstanding_desc";

  type PaymentRow = { amount: number };
  type StudentPick = { id: string; name: string; surname: string; gradeId: number; classId: number };
  type InvoiceRow = {
    id: number;
    studentId: string;
    student: StudentPick;
    term: "TERM1" | "TERM2" | "TERM3";
    dueDate: Date;
    totalAmount: number;
    payments: PaymentRow[];
  };

  type StudentFilter = {
    gradeId?: number;
    classId?: number;
    class?: { schoolId?: number | null };
  };

  type InvoiceWhereInput = {
    term?: "TERM1" | "TERM2" | "TERM3";
    student?: StudentFilter;
  };

  type InvoiceFindManyArgs = {
    where?: InvoiceWhereInput;
    select: {
      id: true; studentId: true; term: true; dueDate: true; totalAmount: true;
      student: { select: { id: true; name: true; surname: true; gradeId: true; classId: true } };
      payments: { select: { amount: true } };
    };
  };

  type FinancePrisma = {
    invoice: {
      findMany: (args: InvoiceFindManyArgs) => Promise<InvoiceRow[]>;
    };
  };

  const financePrisma = prisma as unknown as FinancePrisma;

  const { schoolId } = await getCurrentSchoolContext();

  const where: InvoiceWhereInput = {
    ...(params.term ? { term: params.term } : {}),
  };

  if (params.gradeId || params.classId) {
    where.student = {
      ...(params.gradeId ? { gradeId: Number(params.gradeId) } : {}),
      ...(params.classId ? { classId: Number(params.classId) } : {}),
    };
  }

  if (schoolId !== null) {
    where.student = {
      ...(where.student ?? {}),
      class: {
        ...(where.student?.class ?? {}),
        schoolId,
      },
    };
  }

  const invoices = await financePrisma.invoice.findMany({
    where,
    select: {
      id: true,
      studentId: true,
      term: true,
      dueDate: true,
      totalAmount: true,
      student: { select: { id: true, name: true, surname: true, gradeId: true, classId: true } },
      payments: { select: { amount: true } },
    },
  });

  const withOutstanding = invoices.map((inv) => {
    const paid = inv.payments.reduce((sum: number, p: PaymentRow) => sum + p.amount, 0);
    const outstanding = Math.max(inv.totalAmount - paid, 0);
    return { ...inv, paid, outstanding };
  }).filter((x) => x.outstanding > 0);

  const sorted = [...withOutstanding].sort((a, b) =>
    sort === "outstanding_asc" ? a.outstanding - b.outstanding : b.outstanding - a.outstanding
  );

  const totalDebtors = sorted.length;
  const totalOutstanding = sorted.reduce((sum, r) => sum + r.outstanding, 0);
  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const buildQuery = (patch: Partial<DebtorsSearchParams>): string => {
    const q = new URLSearchParams();
    const merged: DebtorsSearchParams = { ...params, ...patch };
    if (merged.term) q.set("term", merged.term);
    if (merged.gradeId) q.set("gradeId", merged.gradeId);
    if (merged.classId) q.set("classId", merged.classId);
    if (merged.sort) q.set("sort", merged.sort);
    q.set("page", String(merged.page ?? page));
    q.set("pageSize", String(merged.pageSize ?? pageSize));
    return q.toString();
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Finance", href: "/finance/invoices" },
        { label: "Debtors" },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Debtors</h1>
        <a
          href={`/finance/debtors/export?${buildQuery({})}`}
          className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Term</label>
          <select name="term" defaultValue={params.term ?? ""} className="p-2 rounded-md ring-1 ring-gray-300">
            <option value="">All</option>
            <option value="TERM1">TERM1</option>
            <option value="TERM2">TERM2</option>
            <option value="TERM3">TERM3</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Grade ID</label>
          <input name="gradeId" defaultValue={params.gradeId ?? ""} className="p-2 rounded-md ring-1 ring-gray-300" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Class ID</label>
          <input name="classId" defaultValue={params.classId ?? ""} className="p-2 rounded-md ring-1 ring-gray-300" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Sort</label>
          <select name="sort" defaultValue={sort} className="p-2 rounded-md ring-1 ring-gray-300">
            <option value="outstanding_desc">Outstanding desc</option>
            <option value="outstanding_asc">Outstanding asc</option>
          </select>
        </div>
        <button className="px-3 py-2 text-sm rounded-md bg-gray-800 text-white">Apply</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total debtors</div>
          <div className="text-lg font-semibold">{totalDebtors}</div>
        </div>
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total outstanding</div>
          <div className="text-lg font-semibold">{formatKES(totalOutstanding)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Term</th>
              <th className="py-2 pr-4">Due</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((d) => (
              <tr key={d.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{d.id}</td>
                <td className="py-2 pr-4">{d.student.name} {d.student.surname}</td>
                <td className="py-2 pr-4">{d.term}</td>
                <td className="py-2 pr-4">{new Date(d.dueDate).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{formatKES(d.totalAmount)}</td>
                <td className="py-2 pr-4">{formatKES(d.paid)}</td>
                <td className="py-2 pr-4">{formatKES(d.outstanding)}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-gray-500">
                  No debtors match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <a className="px-3 py-2 text-sm rounded-md ring-1 ring-gray-300 disabled:opacity-50"
           aria-disabled={page <= 1}
           href={page > 1 ? `/finance/debtors?${buildQuery({ page: String(page - 1) })}` : "#"}>Prev</a>
        <span className="text-sm text-gray-600">Page {page}</span>
        <a className="px-3 py-2 text-sm rounded-md ring-1 ring-gray-300"
           href={`/finance/debtors?${buildQuery({ page: String(page + 1) })}`}>Next</a>
      </div>
    </div>
  );
}
