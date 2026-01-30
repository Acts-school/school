import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Fragment } from "react";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

type FeeFrequencyLiteral = "TERMLY" | "YEARLY" | "ONE_TIME";

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

type CategoryTotals = {
  due: number;
  outstanding: number;
};

type PivotTotalsByTerm = Partial<Record<TermLiteral, Map<number, CategoryTotals>>>;

type FeeCategoryRow = {
  id: number;
  name: string;
  frequency: FeeFrequencyLiteral;
};

type GroupValue = {
  info: ClassKeyInfo;
  totals: Totals;
  byTerm: PivotTotalsByTerm;
};

type StudentFeeRow = {
  id: string;
  amountDue: number;
  amountPaid: number;
  term: TermLiteral | null;
  academicYear: number | null;
  feeCategoryId: number | null;
  feeCategory: { id: number; name: string } | null;
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
    feeCategoryId: true;
    feeCategory: {
      select: {
        id: true;
        name: true;
      };
    };
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
  feeCategory: {
    findMany: (args: {
      where?: { active?: boolean; frequency?: FeeFrequencyLiteral };
      select: { id: true; name: true; frequency: true };
      orderBy?: { name: "asc" | "desc" };
    }) => Promise<FeeCategoryRow[]>;
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

const termLabel = (term: TermLiteral): string => {
  if (term === "TERM1") return "Term 1";
  if (term === "TERM2") return "Term 2";
  return "Term 3";
};

const getCategoryTotals = (
  pivot: PivotTotalsByTerm,
  term: TermLiteral,
  categoryId: number,
): CategoryTotals => {
  const termMap = pivot[term];
  if (!termMap) {
    return { due: 0, outstanding: 0 };
  }
  const totals = termMap.get(categoryId);
  if (!totals) {
    return { due: 0, outstanding: 0 };
  }
  return totals;
};

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  await ensurePermission("fees.read");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const rawYearParam = toSingleValue(resolvedSearchParams.year);
  const rawTermParam = toSingleValue(resolvedSearchParams.term);
  const rawGradeIdParam = toSingleValue(resolvedSearchParams.gradeId);

  const { academicYear: defaultYear, term: defaultTerm } = await getSchoolSettingsDefaults();

  const selectedTerm: "" | TermLiteral = (() => {
    if (rawTermParam === "TERM1" || rawTermParam === "TERM2" || rawTermParam === "TERM3") {
      return rawTermParam;
    }
    if (rawTermParam === "") {
      return "";
    }
    return defaultTerm;
  })();

  const params: CollectionsSearchParams = {
    year: rawYearParam,
    term: selectedTerm,
    gradeId: rawGradeIdParam,
  };

  const { schoolId } = await getCurrentSchoolContext();

  const year = (() => {
    const raw = params.year;
    if (!raw) return defaultYear;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? defaultYear : parsed;
  })();

  const termFilter: TermLiteral | undefined =
    selectedTerm === "" ? undefined : selectedTerm;

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

  const [grades, feeCategories, rows] = await Promise.all([
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
    financePrisma.feeCategory.findMany({
      where: { active: true, frequency: "TERMLY" },
      select: { id: true, name: true, frequency: true },
      orderBy: { name: "asc" },
    }),
    financePrisma.studentFee.findMany({
      where,
      select: {
        id: true,
        amountDue: true,
        amountPaid: true,
        term: true,
        academicYear: true,
        feeCategoryId: true,
        feeCategory: {
          select: {
            id: true,
            name: true,
          },
        },
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

  const groups = new Map<string, GroupValue>();

  const displayedCategoryIds = new Set<number>(feeCategories.map((category) => category.id));

  const grandTotals: Totals = { due: 0, paid: 0, outstanding: 0 };

  for (const row of rows) {
    const gradeId = row.student.grade?.id ?? row.student.gradeId ?? null;
    const classId = row.student.class?.id ?? row.student.classId ?? null;
    const key = `${gradeId ?? "none"}|${classId ?? "none"}`;

    const outstanding = Math.max(row.amountDue - row.amountPaid, 0);
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
        byTerm: {},
      };
      groups.set(key, group);
    }

    group.totals.due += row.amountDue;
    group.totals.paid += row.amountPaid;
    group.totals.outstanding += outstanding;

    grandTotals.due += row.amountDue;
    grandTotals.paid += row.amountPaid;
    grandTotals.outstanding += outstanding;

    const categoryId = row.feeCategoryId;
    if (categoryId === null || !displayedCategoryIds.has(categoryId)) {
      // Only include TERMLY / displayed categories in the pivoted table.
      // Other categories still contribute to grand totals above.
      // eslint-disable-next-line no-continue
      continue;
    }

    const rowTerm = row.term;
    if (rowTerm !== "TERM1" && rowTerm !== "TERM2" && rowTerm !== "TERM3") {
      // Ignore rows without a concrete term when building the per-term pivot.
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!group.byTerm[rowTerm]) {
      group.byTerm[rowTerm] = new Map<number, CategoryTotals>();
    }

    const termMap = group.byTerm[rowTerm] as Map<number, CategoryTotals>;
    const existingCategoryTotals = termMap.get(categoryId);
    if (existingCategoryTotals) {
      existingCategoryTotals.due += row.amountDue;
      existingCategoryTotals.outstanding += outstanding;
    } else {
      termMap.set(categoryId, {
        due: row.amountDue,
        outstanding,
      });
    }
  }

  const summaryRows = Array.from(groups.values()).sort((a, b) => {
    const aGrade = a.info.gradeLevel ?? 0;
    const bGrade = b.info.gradeLevel ?? 0;
    if (aGrade !== bGrade) return aGrade - bGrade;
    const aClass = a.info.className ?? "";
    const bClass = b.info.className ?? "";
    return aClass.localeCompare(bClass);
  });

  const termOrder: TermLiteral[] = ["TERM1", "TERM2", "TERM3"];
  const activeTerms: TermLiteral[] = termFilter ? [termFilter] : termOrder;

  const totalsByTermCategory: PivotTotalsByTerm = {};

  for (const row of summaryRows) {
    for (const term of termOrder) {
      const termMap = row.byTerm[term];
      if (!termMap) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (!totalsByTermCategory[term]) {
        totalsByTermCategory[term] = new Map<number, CategoryTotals>();
      }

      const globalTermMap = totalsByTermCategory[term] as Map<number, CategoryTotals>;

      for (const [categoryId, catTotals] of termMap.entries()) {
        const existing = globalTermMap.get(categoryId);
        if (existing) {
          existing.due += catTotals.due;
          existing.outstanding += catTotals.outstanding;
        } else {
          globalTermMap.set(categoryId, {
            due: catTotals.due,
            outstanding: catTotals.outstanding,
          });
        }
      }
    }
  }

  const emptyColSpan = 2 + activeTerms.length * feeCategories.length * 2;

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
            defaultValue={selectedTerm}
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

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4" rowSpan={3}>
                Grade
              </th>
              <th className="py-2 pr-4" rowSpan={3}>
                Class
              </th>
              {activeTerms.length === 1 && termFilter
                ? (
                  <th
                    className="py-2 pr-4 text-center"
                    colSpan={feeCategories.length * 2}
                  >
                    {termLabel(termFilter)}
                  </th>
                )
                : termOrder.map((term) => (
                    <th
                      key={term}
                      className="py-2 pr-4 text-center"
                      colSpan={feeCategories.length * 2}
                    >
                      {termLabel(term)}
                    </th>
                  ))}
            </tr>
            <tr className="text-left border-b">
              {(termFilter ? [termFilter] : termOrder).map((term) =>
                feeCategories.map((category) => (
                  <th
                    key={`${term}-${category.id}`}
                    className="py-2 pr-4 text-center"
                    colSpan={2}
                  >
                    {category.name}
                  </th>
                )),
              )}
            </tr>
            <tr className="text-left border-b">
              {(termFilter ? [termFilter] : termOrder).map((term) =>
                feeCategories.map((category) => (
                  <Fragment key={`${term}-${category.id}-labels`}>
                    <th className="py-2 pr-4 text-right">Total due</th>
                    <th className="py-2 pr-4 text-right">Outstanding</th>
                  </Fragment>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(({ info, byTerm }) => (
              <tr key={`${info.gradeId ?? "none"}|${info.classId ?? "none"}`} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{info.gradeLevel ?? "-"}</td>
                <td className="py-2 pr-4">{info.className ?? "-"}</td>
                {(termFilter ? [termFilter] : termOrder).map((term) =>
                  feeCategories.map((category) => {
                    const classTotals = getCategoryTotals(byTerm, term, category.id);

                    return (
                      <Fragment
                        key={`${info.gradeId ?? "none"}|${info.classId ?? "none"}|${term}-${category.id}`}
                      >
                        <td className="py-2 pr-4 text-right">{formatKES(classTotals.due)}</td>
                        <td className="py-2 pr-4 text-right">{formatKES(classTotals.outstanding)}</td>
                      </Fragment>
                    );
                  }),
                )}
              </tr>
            ))}
            {summaryRows.length === 0 && (
              <tr>
                <td className="py-4 pr-4 text-sm text-gray-500" colSpan={emptyColSpan}>
                  No student fees found for the selected filters.
                </td>
              </tr>
            )}
            {summaryRows.length > 0 && (
              <tr className="font-semibold border-t">
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4" />
                {(termFilter ? [termFilter] : termOrder).map((term) =>
                  feeCategories.map((category) => {
                    const totalCell = getCategoryTotals(totalsByTermCategory, term, category.id);

                    return (
                      <Fragment key={`total-${term}-${category.id}`}>
                        <td className="py-2 pr-4 text-right">{formatKES(totalCell.due)}</td>
                        <td className="py-2 pr-4 text-right">{formatKES(totalCell.outstanding)}</td>
                      </Fragment>
                    );
                  }),
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
