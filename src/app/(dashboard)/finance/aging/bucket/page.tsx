import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
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

type AgingBucketSearchParams = {
  year: string | undefined;
  term: string | undefined;
  gradeId: string | undefined;
  classId: string | undefined;
  bucket: string | undefined;
};

type AgingBucketPageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
  dueDate: Date | null;
  term: TermLiteral | null;
  academicYear: number | null;
  student: {
    id: string;
    name: string;
    surname: string;
    grade: { id: number; level: number } | null;
    class: { id: number; name: string } | null;
  };
};

type StudentFeeWhereInput = {
  academicYear: number;
  term?: TermLiteral;
  student?: {
    gradeId?: number;
    classId?: number;
  };
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
        id: true;
        name: true;
        surname: true;
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

const ageBucketByDays = (days: number | null): AgeBucketId => {
  if (days === null) return "no_due_date";
  if (days < 0) return "not_due_yet";
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
};

const BUCKET_LABELS: Record<AgeBucketId, string> = {
  not_due_yet: "Not yet due",
  d0_30: "0–30 days",
  d31_60: "31–60 days",
  d61_90: "61–90 days",
  d90_plus: "> 90 days",
  no_due_date: "No due date",
};

const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function AgingBucketPage({
  searchParams,
}: AgingBucketPageProps) {
  await ensurePermission("fees.read");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const params: AgingBucketSearchParams = {
    year: toSingleValue(resolvedSearchParams.year),
    term: toSingleValue(resolvedSearchParams.term),
    gradeId: toSingleValue(resolvedSearchParams.gradeId),
    classId: toSingleValue(resolvedSearchParams.classId),
    bucket: toSingleValue(resolvedSearchParams.bucket),
  };
  const { academicYear: defaultYear, term: defaultTerm } = await getSchoolSettingsDefaults();

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

  const gradeIdNumber = params.gradeId ? Number.parseInt(params.gradeId, 10) : undefined;
  const classIdNumber = params.classId ? Number.parseInt(params.classId, 10) : undefined;

  const bucket: AgeBucketId | null = (() => {
    const raw = params.bucket;
    if (!raw) return null;
    if (
      raw === "not_due_yet" ||
      raw === "d0_30" ||
      raw === "d31_60" ||
      raw === "d61_90" ||
      raw === "d90_plus" ||
      raw === "no_due_date"
    ) {
      return raw;
    }
    return null;
  })();

  if (!bucket) {
    return (
      <div className="p-4">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Finance", href: "/finance/fees" },
            { label: "Aging", href: "/finance/aging" },
          ]}
        />
        <div className="mt-6 text-sm text-red-600">Invalid aging bucket.</div>
      </div>
    );
  }

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

  const rows = await financePrisma.studentFee.findMany({
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
          id: true,
          name: true,
          surname: true,
          grade: { select: { id: true, level: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
  });

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  const detailedRows = rows
    .map((row) => {
      const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
      if (outstanding <= 0) {
        return null;
      }

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
      if (bucketId !== bucket) {
        return null;
      }

      return {
        id: row.id,
        student: row.student,
        term: row.term,
        academicYear: row.academicYear,
        dueDate,
        daysPastDue,
        amountDue: row.amountDue,
        amountPaid: row.amountPaid,
        outstanding,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => {
      const aDays = a.daysPastDue ?? -1;
      const bDays = b.daysPastDue ?? -1;
      return bDays - aDays;
    });

  const summaryOutstanding = detailedRows.reduce((sum, r) => sum + r.outstanding, 0);

  const search = new URLSearchParams();
  search.set("year", String(year));
  if (termFilter) search.set("term", termFilter);
  if (params.gradeId) search.set("gradeId", params.gradeId);
  if (params.classId) search.set("classId", params.classId);

  const agingHref = `/finance/aging?${search.toString()}`;

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: "Aging", href: agingHref },
          { label: BUCKET_LABELS[bucket] },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Aging Bucket – {BUCKET_LABELS[bucket]}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Year / Term</div>
          <div className="text-sm font-semibold">
            {year} {termFilter ? `· ${termFilter}` : ""}
          </div>
        </div>
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Rows</div>
          <div className="text-lg font-semibold">{detailedRows.length}</div>
        </div>
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Outstanding in bucket</div>
          <div className="text-lg font-semibold">{formatKES(summaryOutstanding)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Class</th>
              <th className="py-2 pr-4">Grade</th>
              <th className="py-2 pr-4">Term</th>
              <th className="py-2 pr-4">Due date</th>
              <th className="py-2 pr-4">Days past due</th>
              <th className="py-2 pr-4">Due</th>
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {detailedRows.map((r) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <Link
                    href={`/finance/students/${r.student.id}/fees?year=${encodeURIComponent(String(year))}`}
                    className="text-blue-600 hover:underline"
                  >
                    {r.student.name} {r.student.surname}
                  </Link>
                </td>
                <td className="py-2 pr-4">{r.student.class?.name ?? "-"}</td>
                <td className="py-2 pr-4">{r.student.grade?.level ?? "-"}</td>
                <td className="py-2 pr-4">{r.term ?? ""}</td>
                <td className="py-2 pr-4">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "-"}</td>
                <td className="py-2 pr-4">{r.daysPastDue ?? "-"}</td>
                <td className="py-2 pr-4">{formatKES(r.amountDue)}</td>
                <td className="py-2 pr-4">{formatKES(r.amountPaid)}</td>
                <td className="py-2 pr-4">{formatKES(r.outstanding)}</td>
              </tr>
            ))}
            {detailedRows.length === 0 && (
              <tr>
                <td className="py-4 pr-4 text-sm text-gray-500" colSpan={9}>
                  No outstanding fees found for this bucket and filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
