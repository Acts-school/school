import prisma from "@/lib/prisma";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export default async function ExpensesPage() {
  await ensurePermission("expenses.read");
  const { academicYear } = await getSchoolSettingsDefaults();
  const { schoolId } = await getCurrentSchoolContext();
  const scopeLabel = schoolId === null ? "All schools" : `School #${schoolId}`;

  type BudgetAmountRow = { month: number; amount: number };
  type BudgetItemRow = {
    kind: "OVERHEAD" | "STAFF" | "INCOME" | "OTHER";
    category: string | null;
    amounts: BudgetAmountRow[];
  };
  type BudgetSectionRow = { items: BudgetItemRow[] };
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
              category: true;
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

  type ExpenseRow = {
    id: number;
    title: string;
    amount: number;
    category: string;
    date: Date;
    notes: string | null;
  };
  type ExpenseFindManyArgs = { orderBy: { id: "desc" } };
  type FinancePrisma = {
    expense: { findMany: (args: ExpenseFindManyArgs) => Promise<ExpenseRow[]> };
    budgetYear: { findFirst: (args: BudgetYearFindFirstArgs) => Promise<BudgetYearRow | null> };
  };
  const financePrisma = prisma as unknown as FinancePrisma;

  const [expenses, approvedBudgetYear] = await Promise.all([
    financePrisma.expense.findMany({ orderBy: { id: "desc" } }),
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
                category: true,
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

  const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);

  let budgetOverheadsTotal = 0;
  if (approvedBudgetYear) {
    for (const section of approvedBudgetYear.sections) {
      for (const item of section.items) {
        if (item.kind === "OVERHEAD" || item.kind === "OTHER") {
          const itemTotal = item.amounts.reduce((sum, entry) => sum + entry.amount, 0);
          budgetOverheadsTotal += itemTotal;
        }
      }
    }
  }

  const expenseVariance = totalExpenses - budgetOverheadsTotal;

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/expenses" },
          { label: `Expenses (${scopeLabel})` },
        ]}
      />
      <h1 className="text-xl font-semibold">
        Expenses{" "}
        <span className="text-sm text-gray-500">({scopeLabel})</span>
      </h1>
      <ExpenseForm />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">
            Budget vs actual - expenses (year {academicYear})
          </span>
          <span className="text-xs text-gray-500">
            Budgeted overheads: {formatKES(budgetOverheadsTotal)}
          </span>
          <span className="text-xs text-gray-500">
            Actual expenses: {formatKES(totalExpenses)}
          </span>
          <span className="text-xs text-gray-500">
            Variance: {formatKES(expenseVariance)}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e: ExpenseRow) => (
              <tr key={e.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{e.id}</td>
                <td className="py-2 pr-4">{e.title}</td>
                <td className="py-2 pr-4">{e.category}</td>
                <td className="py-2 pr-4">{new Date(e.date).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{formatKES(e.amount)}</td>
                <td className="py-2 pr-4">{e.notes ?? ""}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
