import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";
import ManualStudentFeeAdjustmentForm from "@/components/ManualStudentFeeAdjustmentForm";
import ManualFeeReminderForm from "@/components/ManualFeeReminderForm";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type CollectionsSearchParams = {
  year: string | undefined;
  term: TermLiteral | "" | undefined;
  gradeId: string | undefined;
};

type CollectionsPageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ClassKeyInfo = {
  gradeId: number | null;
  classId: number | null;
  gradeLevel: number | null;
  className: string | null;
};

type Totals = {
  due: number;
  paid: number;
  outstanding: number;
};

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
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
const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  await ensurePermission("fees.read");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const params: CollectionsSearchParams = {
    year: toSingleValue(resolvedSearchParams.year),
    term: toSingleValue(resolvedSearchParams.term) as TermLiteral | "" | undefined,
    gradeId: toSingleValue(resolvedSearchParams.gradeId),
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

  const gradeIdNumber = params.gradeId ? Number.parseInt(params.gradeId, 10) : undefined;

  const where: StudentFeeWhereInput = {
    academicYear: year,
    ...(termFilter ? { term: termFilter } : {}),
  };

  if (schoolId !== null) {
    where.student = {
      ...(where.student ?? {}),
      class: {
        ...(where.student?.class ?? {}),
        schoolId,
      },
    };
  }

  if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
    where.student = {
      ...(where.student ?? {}),
      gradeId: gradeIdNumber,
    };
  }

  const [grades, rows] = await Promise.all([
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
    financePrisma.studentFee.findMany({
      where,
      select: {
        id: true,
        amountDue: true,
        amountPaid: true,
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

  const groups = new Map<
    string,
    {
      info: ClassKeyInfo;
      totals: Totals;
    }
  >();

  const grandTotals: Totals = { due: 0, paid: 0, outstanding: 0 };

  for (const row of rows) {
    const gradeId = row.student.grade?.id ?? row.student.gradeId ?? null;
    const classId = row.student.class?.id ?? row.student.classId ?? null;
    const key = `${gradeId ?? "none"}|${classId ?? "none"}`;

    let group = groups.get(key);
    if (!group) {
      const info: ClassKeyInfo = {
        gradeId,
        classId,
        gradeLevel: row.student.grade?.level ?? null,
        className: row.student.class?.name ?? null,
      };
      group = {
        info,
        totals: { due: 0, paid: 0, outstanding: 0 },
      };
      groups.set(key, group);
    }

    const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
    group.totals.due += row.amountDue;
    group.totals.paid += row.amountPaid;
    group.totals.outstanding += outstanding;

    grandTotals.due += row.amountDue;
    grandTotals.paid += row.amountPaid;
    grandTotals.outstanding += outstanding;
  }

  const summaryRows = Array.from(groups.values()).sort((a, b) => {
    const aGrade = a.info.gradeLevel ?? 0;
    const bGrade = b.info.gradeLevel ?? 0;
    if (aGrade !== bGrade) return aGrade - bGrade;
    const aClass = a.info.className ?? "";
    const bClass = b.info.className ?? "";
    return aClass.localeCompare(bClass);
  });

  const buildQuery = (patch: Partial<CollectionsSearchParams>): string => {
    const q = new URLSearchParams();
    const merged: CollectionsSearchParams = { ...params, ...patch };
    if (merged.year) q.set("year", merged.year);
    if (merged.term) q.set("term", merged.term);
    if (merged.gradeId) q.set("gradeId", merged.gradeId);
    return q.toString();
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: "Collections" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Collections Summary</h1>
        <a
          href={`/finance/collections/export?${buildQuery({})}`}
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
        <button className="px-3 py-2 text-sm rounded-md bg-gray-800 text-white">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total due</div>
          <div className="text-lg font-semibold">{formatKES(grandTotals.due)}</div>
        </div>
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total paid</div>
          <div className="text-lg font-semibold">{formatKES(grandTotals.paid)}</div>
        </div>
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total outstanding</div>
          <div className="text-lg font-semibold">{formatKES(grandTotals.outstanding)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ManualStudentFeeAdjustmentForm />
        <ManualFeeReminderForm />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Grade</th>
              <th className="py-2 pr-4">Class</th>
              <th className="py-2 pr-4">Due</th>
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(({ info, totals }) => (
              <tr key={`${info.gradeId ?? "none"}|${info.classId ?? "none"}`} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{info.gradeLevel ?? "-"}</td>
                <td className="py-2 pr-4">{info.className ?? "-"}</td>
                <td className="py-2 pr-4">{formatKES(totals.due)}</td>
                <td className="py-2 pr-4">{formatKES(totals.paid)}</td>
                <td className="py-2 pr-4">{formatKES(totals.outstanding)}</td>
              </tr>
            ))}
            {summaryRows.length === 0 && (
              <tr>
                <td className="py-4 pr-4 text-sm text-gray-500" colSpan={5}>
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
