import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import BulkClearanceReminderButton from "@/components/BulkClearanceReminderButton";
import ClearanceStudentRowActions from "@/components/ClearanceStudentRowActions";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type ClearanceSearchParams = {
  year: string | undefined;
  gradeId: string | undefined;
  classId: string | undefined;
};

type ClearancePageProps = {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TermLiteral = "TERM1" | "TERM2" | "TERM3";
const toSingleValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function ClearancePage({ searchParams }: ClearancePageProps) {
  await ensurePermission("fees.read");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const params: ClearanceSearchParams = {
    year: toSingleValue(resolvedSearchParams.year),
    gradeId: toSingleValue(resolvedSearchParams.gradeId),
    classId: toSingleValue(resolvedSearchParams.classId),
  };
  const { academicYear: defaultYear } = await getSchoolSettingsDefaults();

  const year = (() => {
    const raw = params.year;
    if (!raw) return defaultYear;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  type StudentPick = {
    id: string;
    name: string;
    surname: string;
    class: { id: number; name: string } | null;
    grade: { id: number; level: number } | null;
  };

  type StudentFeeRow = {
    id: string;
    studentId: string;
    student: StudentPick;
    term: TermLiteral | null;
    academicYear: number | null;
    amountDue: number;
    amountPaid: number;
  };

  type StudentFeeFindManyArgs = {
    where?: {
      academicYear?: number;
      term?: TermLiteral | null;
      student?: {
        gradeId?: number;
        classId?: number;
      };
    };
    select: {
      id: true;
      studentId: true;
      student: {
        select: {
          id: true;
          name: true;
          surname: true;
          class: { select: { id: true; name: true } } | null;
          grade: { select: { id: true; level: true } } | null;
        };
      };
      term: true;
      academicYear: true;
      amountDue: true;
      amountPaid: true;
    };
  };

  type FinancePrisma = {
    studentFee: {
      findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeRow[]>;
    };
  };

  const financePrisma = prisma as unknown as FinancePrisma;

  const where: StudentFeeFindManyArgs["where"] = {
    academicYear: year,
  };

  const gradeIdNumber = params.gradeId ? Number.parseInt(params.gradeId, 10) : undefined;
  const classIdNumber = params.classId ? Number.parseInt(params.classId, 10) : undefined;

  if (gradeIdNumber || classIdNumber) {
    const studentFilter: { gradeId?: number; classId?: number } = {};
    if (typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)) {
      studentFilter.gradeId = gradeIdNumber;
    }
    if (typeof classIdNumber === "number" && !Number.isNaN(classIdNumber)) {
      studentFilter.classId = classIdNumber;
    }
    if (Object.keys(studentFilter).length > 0) {
      where.student = studentFilter;
    }
  }

  const classWhere =
    typeof gradeIdNumber === "number" && !Number.isNaN(gradeIdNumber)
      ? { gradeId: gradeIdNumber }
      : {};

  const [grades, classes] = await Promise.all([
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
    prisma.class.findMany({
      where: classWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = await financePrisma.studentFee.findMany({
    where,
    select: {
      id: true,
      studentId: true,
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          class: { select: { id: true, name: true } },
          grade: { select: { id: true, level: true } },
        },
      },
      term: true,
      academicYear: true,
      amountDue: true,
      amountPaid: true,
    },
  });

  type TermBucket = { due: number; paid: number };
  type StudentAggregate = {
    student: StudentPick;
    terms: Record<TermLiteral, TermBucket>;
  };

  const initialBucket: TermBucket = { due: 0, paid: 0 };

  const byStudent = new Map<string, StudentAggregate>();

  const allTerms: TermLiteral[] = ["TERM1", "TERM2", "TERM3"];

  for (const row of rows) {
    const key = row.studentId;
    let agg = byStudent.get(key);
    if (!agg) {
      const buckets: Record<TermLiteral, TermBucket> = {
        TERM1: { ...initialBucket },
        TERM2: { ...initialBucket },
        TERM3: { ...initialBucket },
      };
      agg = { student: row.student, terms: buckets };
      byStudent.set(key, agg);
    }

    const termKey: TermLiteral = (row.term ?? "TERM1") as TermLiteral;
    const bucket = agg.terms[termKey];
    bucket.due += row.amountDue;
    bucket.paid += row.amountPaid;
  }

  type TermStatus = {
    label: "none" | "unpaid" | "partially_paid" | "paid";
    outstanding: number;
  };

  const computeStatus = (bucket: TermBucket): TermStatus => {
    if (bucket.due === 0 && bucket.paid === 0) {
      return { label: "none", outstanding: 0 };
    }
    if (bucket.paid <= 0) {
      return { label: "unpaid", outstanding: bucket.due };
    }
    if (bucket.paid < bucket.due) {
      return { label: "partially_paid", outstanding: bucket.due - bucket.paid };
    }
    return { label: "paid", outstanding: 0 };
  };

  const aggregates = Array.from(byStudent.values()).map((agg) => {
    const termStatus: Record<TermLiteral, TermStatus> = {
      TERM1: computeStatus(agg.terms.TERM1),
      TERM2: computeStatus(agg.terms.TERM2),
      TERM3: computeStatus(agg.terms.TERM3),
    };
    const totalOutstanding = allTerms.reduce(
      (sum, t) => sum + termStatus[t].outstanding,
      0,
    );
    return { student: agg.student, termStatus, totalOutstanding };
  });

  const totalStudents = aggregates.length;
  const totalOutstandingAll = aggregates.reduce(
    (sum, a) => sum + a.totalOutstanding,
    0,
  );

  const buildQuery = (patch: Partial<ClearanceSearchParams>): string => {
    const q = new URLSearchParams();
    const merged: ClearanceSearchParams = { ...params, ...patch };
    if (merged.year) q.set("year", merged.year);
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
          { label: "Clearance" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Class / Grade Clearance</h1>
        <div className="flex flex-col md:flex-row gap-2 items-end">
          <BulkClearanceReminderButton
            year={year}
            gradeId={params.gradeId}
            classId={params.classId}
          />
          <a
            href={`/finance/clearance/export?${buildQuery({})}`}
            className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            Export CSV
          </a>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total students</div>
          <div className="text-lg font-semibold">{totalStudents}</div>
        </div>
        <div className="p-4 rounded-md ring-1 ring-gray-200">
          <div className="text-xs text-gray-500">Total outstanding (all terms)</div>
          <div className="text-lg font-semibold">{formatKES(totalOutstandingAll)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Class</th>
              <th className="py-2 pr-4">Grade</th>
              <th className="py-2 pr-4">TERM1</th>
              <th className="py-2 pr-4">TERM2</th>
              <th className="py-2 pr-4">TERM3</th>
              <th className="py-2 pr-4">Total Outstanding</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {aggregates.map((a) => (
              <tr key={a.student.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <Link
                    href={`/finance/students/${a.student.id}/fees?year=${encodeURIComponent(String(year))}`}
                    className="text-blue-600 hover:underline"
                  >
                    {a.student.name} {a.student.surname}
                  </Link>
                </td>
                <td className="py-2 pr-4">{a.student.class?.name ?? "-"}</td>
                <td className="py-2 pr-4">{a.student.grade?.level ?? "-"}</td>
                {allTerms.map((t) => {
                  const status = a.termStatus[t];
                  const base =
                    status.label === "paid"
                      ? "text-green-600"
                      : status.label === "partially_paid"
                      ? "text-orange-600"
                      : status.label === "unpaid"
                      ? "text-red-600"
                      : "text-gray-400";
                  const labelText =
                    status.label === "none"
                      ? "-"
                      : status.label === "paid"
                      ? "Paid"
                      : status.label === "partially_paid"
                      ? "Partially paid"
                      : "Unpaid";
                  return (
                    <td key={t} className={`py-2 pr-4 ${base}`}>
                      <div className="flex flex-col text-xs">
                        <span>{labelText}</span>
                        {status.outstanding > 0 && (
                          <span className="text-[11px] text-gray-500">
                            {formatKES(status.outstanding)} outstanding
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="py-2 pr-4">{formatKES(a.totalOutstanding)}</td>
                <td className="py-2 pr-4">
                  <ClearanceStudentRowActions studentId={a.student.id} year={year} />
                </td>
              </tr>
            ))}
            {aggregates.length === 0 && (
              <tr>
                <td className="py-4 pr-4 text-sm text-gray-500" colSpan={8}>
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
