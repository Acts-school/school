import prisma from "@/lib/prisma";
import SimpleStageFeeForm from "@/components/forms/SimpleStageFeeForm";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type FeeFrequencyLiteral = "TERMLY" | "YEARLY" | "ONE_TIME";

const formatFrequencyLabel = (frequency: FeeFrequencyLiteral): string => {
  if (frequency === "TERMLY") return "Termly";
  if (frequency === "YEARLY") return "Yearly";
  return "One-time";
};

type EducationStageLiteral =
  | "PRE_PRIMARY"
  | "LOWER_PRIMARY"
  | "UPPER_PRIMARY"
  | "JUNIOR_SECONDARY"
  | "SENIOR_SECONDARY";

type StageGroupLabel = "ECDE" | "Primary" | "Junior secondary" | "Senior secondary" | "Other";

const inferStageGroupLabel = (level: number | null, stage: EducationStageLiteral | null): StageGroupLabel => {
  if (stage === "PRE_PRIMARY") {
    return "ECDE";
  }

  if (level !== null && level >= 1 && level <= 6) {
    return "Primary";
  }

  if (stage === "JUNIOR_SECONDARY") {
    return "Junior secondary";
  }

  if (stage === "SENIOR_SECONDARY") {
    return "Senior secondary";
  }

  return "Other";
};

export default async function FeesPage() {
  await ensurePermission("fees.read");
  const { academicYear, term } = await getSchoolSettingsDefaults();
  const { schoolId } = await getCurrentSchoolContext();
  const scopeLabel = schoolId === null ? "All schools" : `School #${schoolId}`;

  type TermLiteral = "TERM1" | "TERM2" | "TERM3";

  type StageGroupFeeRow = {
    stageGroup: StageGroupLabel;
    name: string;
    term1Amount: number | null;
    term2Amount: number | null;
    term3Amount: number | null;
    active: boolean;
  };

  type ClassFeeStructureListRow = {
    id: number;
    amount: number;
    active: boolean;
    academicYear: number | null;
    term: TermLiteral | null;
    feeCategory: { name: string; frequency: FeeFrequencyLiteral };
    class: { grade: { level: number; stage: EducationStageLiteral | null } | null } | null;
  };

  type ClassFeeStructureFindManyArgs = {
    where: {
      academicYear?: number | null;
      class?: { schoolId?: number | null };
    };
    include: {
      feeCategory: { select: { name: true; frequency: true } };
      class: { include: { grade: { select: { level: true; stage: true } } } };
    };
  };

  type StudentFeeSummaryRow = {
    amountDue: number;
    amountPaid: number;
  };

  type StudentFeeFindManyArgs = {
    where: {
      academicYear: number;
      term?: TermLiteral | null;
    };
    select: {
      amountDue: true;
      amountPaid: true;
    };
  };

  type BudgetAmountRow = {
    month: number;
    amount: number;
  };

  type BudgetItemRow = {
    kind: "OVERHEAD" | "STAFF" | "INCOME" | "OTHER";
    amounts: BudgetAmountRow[];
  };

  type BudgetSectionRow = {
    items: BudgetItemRow[];
  };

  type BudgetYearRow = {
    id: number;
    academicYear: number;
    status: "DRAFT" | "APPROVED" | "ARCHIVED";
    sections: BudgetSectionRow[];
  };

  type BudgetYearFindFirstArgs = {
    where: {
      academicYear: number;
      status: "APPROVED";
      schoolId?: number | null;
    };
    select: {
      id: true;
      academicYear: true;
      status: true;
      sections: {
        select: {
          items: {
            select: {
              kind: true;
              amounts: {
                select: {
                  month: true;
                  amount: true;
                };
              };
            };
          };
        };
      };
    };
  };

  type FinancePrisma = {
    classFeeStructure: {
      findMany: (args: ClassFeeStructureFindManyArgs) => Promise<ClassFeeStructureListRow[]>;
    };
    studentFee: { findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeSummaryRow[]> };
    budgetYear: { findFirst: (args: BudgetYearFindFirstArgs) => Promise<BudgetYearRow | null> };
  };

  const financePrisma = prisma as unknown as FinancePrisma;

  const [classFees, studentFees, approvedBudgetYear] = await Promise.all([
    financePrisma.classFeeStructure.findMany({
      where: {
        academicYear,
        ...(schoolId !== null ? { class: { schoolId } } : {}),
      },
      include: {
        feeCategory: { select: { name: true, frequency: true } },
        class: { include: { grade: { select: { level: true, stage: true } } } },
      },
    }),
    financePrisma.studentFee.findMany({
      where: {
        academicYear,
        ...(term ? { term: term as TermLiteral } : {}),
      },
      select: {
        amountDue: true,
        amountPaid: true,
      },
    }),
    financePrisma.budgetYear.findFirst({
      where: {
        academicYear,
        status: "APPROVED",
        ...(schoolId !== null ? { schoolId } : {}),
      },
      select: {
        id: true,
        academicYear: true,
        status: true,
        sections: {
          select: {
            items: {
              select: {
                kind: true,
                amounts: {
                  select: {
                    month: true,
                    amount: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const groupedFees = new Map<string, StageGroupFeeRow & { activeFlags: boolean[] }>();

  for (const row of classFees) {
    const gradeLevel: number | null = row.class?.grade?.level ?? null;
    const gradeStage: EducationStageLiteral | null = row.class?.grade?.stage ?? null;
    const stageGroup = inferStageGroupLabel(gradeLevel, gradeStage);

    const key = `${stageGroup}::${row.feeCategory.name}`;

    const existing = groupedFees.get(key);

    const base: StageGroupFeeRow & { activeFlags: boolean[] } =
      existing ?? {
        stageGroup,
        name: row.feeCategory.name,
        term1Amount: null,
        term2Amount: null,
        term3Amount: null,
        active: false,
        activeFlags: [],
      };

    const effectiveTerm: TermLiteral = (row.term ?? "TERM1") as TermLiteral;

    if (effectiveTerm === "TERM1") {
      base.term1Amount = row.amount;
    } else if (effectiveTerm === "TERM2") {
      base.term2Amount = row.amount;
    } else if (effectiveTerm === "TERM3") {
      base.term3Amount = row.amount;
    }

    base.activeFlags.push(row.active);
    groupedFees.set(key, base);
  }

  const fees: StageGroupFeeRow[] = Array.from(groupedFees.values()).map((row) => ({
    stageGroup: row.stageGroup,
    name: row.name,
    term1Amount: row.term1Amount,
    term2Amount: row.term2Amount,
    term3Amount: row.term3Amount,
    active: row.activeFlags.some((flag) => flag),
  }));

  const totalFeesDue = studentFees.reduce((sum, row) => sum + row.amountDue, 0);
  const totalFeesPaid = studentFees.reduce((sum, row) => sum + row.amountPaid, 0);

  let budgetIncomeTotal = 0;
  if (approvedBudgetYear) {
    for (const section of approvedBudgetYear.sections) {
      for (const item of section.items) {
        if (item.kind !== "INCOME") {
          continue;
        }

        const itemTotal = item.amounts.reduce((sum, entry) => sum + entry.amount, 0);
        budgetIncomeTotal += itemTotal;
      }
    }
  }

  const incomeVariance = totalFeesPaid - budgetIncomeTotal;

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: `Fee Structure (${scopeLabel})` },
        ]}
      />
      <h1 className="text-xl font-semibold">
        Fee Structure{" "}
        <span className="text-sm text-gray-500">({scopeLabel})</span>
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">
            Budget vs actual - fee income (year {academicYear}
            {term ? `, ${term}` : ""})
          </span>
          <span className="text-xs text-gray-500">
            Budgeted income (approved budget): {formatKES(budgetIncomeTotal)}
          </span>
          <span className="text-xs text-gray-500">
            Actual fee income received: {formatKES(totalFeesPaid)}
          </span>
          <span className="text-xs text-gray-500">
            Variance (actual - budget): {formatKES(incomeVariance)}
          </span>
          <span className="text-xs text-gray-500">
            Fees due (for context): {formatKES(totalFeesDue)}
          </span>
        </div>
      </div>
      <SimpleStageFeeForm />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Stage group</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">TERM1</th>
              <th className="py-2 pr-4">TERM2</th>
              <th className="py-2 pr-4">TERM3</th>
              <th className="py-2 pr-4">Active</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f: StageGroupFeeRow) => (
              <tr key={`${f.stageGroup}::${f.name}`} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{f.stageGroup}</td>
                <td className="py-2 pr-4">{f.name}</td>
                <td className="py-2 pr-4">{f.term1Amount !== null ? formatKES(f.term1Amount) : "-"}</td>
                <td className="py-2 pr-4">{f.term2Amount !== null ? formatKES(f.term2Amount) : "-"}</td>
                <td className="py-2 pr-4">{f.term3Amount !== null ? formatKES(f.term3Amount) : "-"}</td>
                <td className="py-2 pr-4">{f.active ? "Yes" : "No"}</td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No fee structures yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
