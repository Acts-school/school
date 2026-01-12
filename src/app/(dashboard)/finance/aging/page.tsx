import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type AgeBucketId =
  | "not_due_yet"
  | "d0_30"
  | "d31_60"
  | "d61_90"
  | "d90_plus"
  | "no_due_date";

type SearchParams = {
  year: string | undefined;
  term: string | undefined;
  gradeId: string | undefined;
  classId: string | undefined;
  bucket?: AgeBucketId;
};

type AgingPageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AgeBucketMeta = {
  id: AgeBucketId;
  label: string;
  order: number;
};

type AgeBucketTotals = {
  count: number;
  outstanding: number;
};

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date | null;
  term: TermLiteral | null;
  academicYear: number | null;
  student: {
    gradeId: number | null;
    classId: number | null;
    grade: { id: number; level: number } | null;
    class: { id: number; name: string } | null;
  };
};

type StudentFilter = {
  gradeId?: number;
  classId?: number;
  class?: {
    schoolId?: number | null;
  };
};

type StudentFeeWhereInput = {
  academicYear: number;
  term?: TermLiteral;
  student?: StudentFilter;
};

type StudentFeeFindManyArgs = {
  where: StudentFeeWhereInput;
  select: {
    id: true;
    amountDue: true;
    amountPaid: true;
    dueDate: true;
    term: true;
    academicYear: true;
    student: {
      select: {
        gradeId: true;
        classId: true;
        grade: { select: { id: true; level: true } } | null;
        class: { select: { id: true; name: true } } | null;
      };
    };
  };
};

type FinancePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
  };
};

const financePrisma = prisma as unknown as FinancePrisma;

const AGE_BUCKETS: AgeBucketMeta[] = [
  { id: "not_due_yet", label: "Not yet due", order: 0 },
  { id: "d0_30", label: "0–30 days", order: 1 },
  { id: "d31_60", label: "31–60 days", order: 2 },
  { id: "d61_90", label: "61–90 days", order: 3 },
  { id: "d90_plus", label: "> 90 days", order: 4 },
  { id: "no_due_date", label: "No due date", order: 5 },
];

const ageBucketByDays = (days: number | null): AgeBucketId => {
  if (days === null) return "no_due_date";
  if (days < 0) return "not_due_yet";
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
};

const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function AgingPage({ searchParams }: AgingPageProps) {
  await ensurePermission("fees.read");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const params: SearchParams = {
    year: toSingleValue(resolvedSearchParams.year),
    term: toSingleValue(resolvedSearchParams.term),
    gradeId: toSingleValue(resolvedSearchParams.gradeId),
    classId: toSingleValue(resolvedSearchParams.classId),
  };
  const { academicYear: defaultYear, term: defaultTerm } = await getSchoolSettingsDefaults();

  const { schoolId } = await getCurrentSchoolContext();

  const year = (() => {
    const raw = params.year;
    if (!raw) return defaultYear;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  const termFilter: TermLiteral | undefined = (() => {
    const raw = params.term;
    if (raw === "TERM1" || raw === "TERM2" || raw === "TERM3") {
      return raw;
    }
    return defaultTerm;
  })();

  const now = new Date();

  const gradeIdNumber = params.gradeId ? Number.parseInt(params.gradeId, 10) : undefined;
  const classIdNumber = params.classId ? Number.parseInt(params.classId, 10) : undefined;

  const where: StudentFeeWhereInput = {
    academicYear: year,
    ...(termFilter ? { term: termFilter } : {}),
  };

  if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
    where.student = { ...(where.student ?? {}), gradeId: gradeIdNumber };
  }

  if (typeof classIdNumber === "number" && !Number.isNaN(classIdNumber)) {
    where.student = { ...(where.student ?? {}), classId: classIdNumber };
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

  const classWhere = {
    ...(typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)
      ? { gradeId: gradeIdNumber }
      : {}),
    ...(schoolId !== null ? { schoolId } : {}),
  };

  const [grades, classes, rows] = await Promise.all([
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
    prisma.class.findMany({
      where: classWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    financePrisma.studentFee.findMany({
      where,
      select: {
        id: true,
        amountDue: true,
        amountPaid: true,
        dueDate: true,
        term: true,
        academicYear: true,
        student: {
          select: {
            gradeId: true,
            classId: true,
            grade: { select: { id: true, level: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const bucketTotals = new Map<AgeBucketId, AgeBucketTotals>();
  AGE_BUCKETS.forEach((b) => {
    bucketTotals.set(b.id, { count: 0, outstanding: 0 });
  });

  let grandOutstanding = 0;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
    if (outstanding <= 0) continue;

    const dueDate = row.dueDate;
    let daysPastDue: number | null = null;
    if (dueDate instanceof Date) {
      const dueMidnight = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
      ).getTime();
      daysPastDue = Math.floor((todayMidnight - dueMidnight) / msPerDay);
    }

    const bucketId = ageBucketByDays(daysPastDue);
    const bucket = bucketTotals.get(bucketId);
    if (!bucket) continue;

    bucket.count += 1;
    bucket.outstanding += outstanding;
    grandOutstanding += outstanding;
  }

  const bucketRows = AGE_BUCKETS.map((meta) => ({
    meta,
    totals: bucketTotals.get(meta.id) ?? { count: 0, outstanding: 0 },
  }));

  const buildQuery = (patch: Partial<SearchParams>): string => {
    const q = new URLSearchParams();
    const merged: SearchParams = { ...params, ...patch };
    if (merged.year) q.set("year", merged.year);
    if (merged.term) q.set("term", merged.term);
    if (merged.gradeId) q.set("gradeId", merged.gradeId);
    if (merged.classId) q.set("classId", merged.classId);
    return q.toString();
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: "Aging" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Aging Report</h1>
        <a
          href={`/finance/aging/export?${buildQuery({})}`}
          className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Year</label>
          <input
            name="year"
            defaultValue={String(year)}
            className="p-2 rounded-md ring-1 ring-gray-300 w-24"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Term</label>
          <select
            name="term"
            defaultValue={termFilter ?? ""}
            className="p-2 rounded-md ring-1 ring-gray-300 w-28"
          >
            <option value="">All terms</option>
            <option value="TERM1">TERM1</option>
            <option value="TERM2">TERM2</option>
            <option value="TERM3">TERM3</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Grade</label>
          <select
            name="gradeId"
            defaultValue={params.gradeId ?? ""}
            className="p-2 rounded-md ring-1 ring-gray-300 w-28"
          >
            <option value="">All grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={String(grade.id)}>
                {grade.level}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500">Class</label>
          <select
            name="classId"
            defaultValue={params.classId ?? ""}
            className="p-2 rounded-md ring-1 ring-gray-300 w-36"
          >
            <option value="">All classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={String(cls.id)}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        <button className="px-3 py-2 text-sm rounded-md bg-gray-800 text-white">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total outstanding</div>
          <div className="text-lg font-semibold">{formatKES(grandOutstanding)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Bucket</th>
              <th className="py-2 pr-4">Count</th>
              <th className="py-2 pr-4">Outstanding</th>
              <th className="py-2 pr-4">% of total</th>
            </tr>
          </thead>
          <tbody>
            {bucketRows.map(({ meta, totals }) => {
              const percentage = grandOutstanding > 0 ? (totals.outstanding / grandOutstanding) * 100 : 0;
              return (
                <tr key={meta.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/finance/aging/bucket?${buildQuery({ bucket: meta.id })}`}
                      className="text-blue-600 hover:underline"
                    >
                      {meta.label}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{totals.count}</td>
                  <td className="py-2 pr-4">{formatKES(totals.outstanding)}</td>
                  <td className="py-2 pr-4">{percentage.toFixed(1)}%</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="py-4 pr-4 text-sm text-gray-500" colSpan={4}>
                  No student fees found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
