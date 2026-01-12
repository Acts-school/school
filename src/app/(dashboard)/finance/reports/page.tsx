import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import { getSchoolSettingsDefaults } from "@/lib/schoolSettings";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

type TermLiteral = "TERM1" | "TERM2" | "TERM3";

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

type ExpenseRow = {
  amount: number;
};

type ExpenseFindManyArgs = {
  select: {
    amount: true;
  };
};

type InvoicePaymentRow = {
  amount: number;
};

type InvoiceRow = {
  totalAmount: number;
  payments: InvoicePaymentRow[];
};

type InvoiceFindManyArgs = {
  select: {
    totalAmount: true;
    payments: {
      select: {
        amount: true;
      };
    };
  };
};

type BudgetItemKindLiteral = "OVERHEAD" | "STAFF" | "INCOME" | "OTHER";

type BudgetAmountRow = {
  month: number;
  amount: number;
};

type BudgetItemRow = {
  kind: BudgetItemKindLiteral;
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

type PayrollRow = {
  netPay: number;
};

type PayrollPeriodRow = {
  year: number;
  payrolls: PayrollRow[];
};

type PayrollPeriodFindManyArgs = {
  where: {
    year: number;
    schoolId?: number | null;
  };
  select: {
    year: true;
    payrolls: {
      select: {
        netPay: true;
      };
    };
  };
};

type FinancePrisma = {
  studentFee: {
    findMany: (args: StudentFeeFindManyArgs) => Promise<StudentFeeSummaryRow[]>;
  };
  expense: {
    findMany: (args: ExpenseFindManyArgs) => Promise<ExpenseRow[]>;
  };
  invoice: {
    findMany: (args: InvoiceFindManyArgs) => Promise<InvoiceRow[]>;
  };
  budgetYear: {
    findFirst: (args: BudgetYearFindFirstArgs) => Promise<BudgetYearRow | null>;
  };
  payrollPeriod: {
    findMany: (args: PayrollPeriodFindManyArgs) => Promise<PayrollPeriodRow[]>;
  };
};

const financePrisma = prisma as unknown as FinancePrisma;

export default async function FinanceAdminReportsPage() {
  await ensurePermission("reports.view_admin");

  const { academicYear, term } = await getSchoolSettingsDefaults();
  const { schoolId } = await getCurrentSchoolContext();

  const [fees, expenses, invoices, approvedBudgetYear, payrollPeriods] = await Promise.all([
    financePrisma.studentFee.findMany({
      where: {
        academicYear,
        ...(term ? { term } : {}),
      },
      select: {
        amountDue: true,
        amountPaid: true,
      },
    }),
    financePrisma.expense.findMany({
      select: {
        amount: true,
      },
    }),
    financePrisma.invoice.findMany({
      select: {
        totalAmount: true,
        payments: { select: { amount: true } },
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
                }
              },
            },
          },
        },
      },
    }),
    financePrisma.payrollPeriod.findMany({
      where: {
        year: academicYear,
        ...(schoolId !== null ? { schoolId } : {}),
      },
      select: {
        year: true,
        payrolls: {
          select: {
            netPay: true,
          },
        },
      },
    }),
  ]);

  const totalFeesDue = fees.reduce((sum, row) => sum + row.amountDue, 0);
  const totalFeesPaid = fees.reduce((sum, row) => sum + row.amountPaid, 0);
  const totalFeesOutstanding = Math.max(totalFeesDue - totalFeesPaid, 0);

  const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalInvoicePaid = invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((inner, p) => inner + p.amount, 0),
    0,
  );
  const totalInvoiceOutstanding = Math.max(totalInvoiced - totalInvoicePaid, 0);

  let budgetIncomeTotal = 0;
  let budgetExpensesTotal = 0;
  let budgetStaffTotal = 0;

  if (approvedBudgetYear) {
    for (const section of approvedBudgetYear.sections) {
      for (const item of section.items) {
        const itemTotal = item.amounts.reduce((sum, entry) => sum + entry.amount, 0);

        if (item.kind === "INCOME") {
          budgetIncomeTotal += itemTotal;
        } else if (item.kind === "STAFF") {
          budgetStaffTotal += itemTotal;
        } else {
          budgetExpensesTotal += itemTotal;
        }
      }
    }
  }

  const totalStaffPayroll = payrollPeriods.reduce(
    (sum, period) =>
      sum + period.payrolls.reduce((inner, payroll) => inner + payroll.netPay, 0),
    0,
  );

  const incomeVariance = totalFeesPaid - budgetIncomeTotal;
  const expenseVariance = totalExpenses - budgetExpensesTotal;
  const staffVariance = totalStaffPayroll - budgetStaffTotal;

  const yearLabel = academicYear;
  const termLabel: string = term ?? "All terms";
  const scopeLabel = schoolId === null ? "All schools" : `School #${schoolId}`;

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: `Admin Reports (${scopeLabel})` },
        ]}
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          Admin Finance Reports{" "}
          <span className="text-sm text-gray-500">({scopeLabel})</span>
        </h1>
        <p className="text-sm text-gray-600">
          Overview for {scopeLabel.toLowerCase()} – academic year {yearLabel} and term {termLabel}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Fees - total due</span>
          <span className="text-lg font-semibold">{formatKES(totalFeesDue)}</span>
          <span className="text-xs text-gray-500">Paid: {formatKES(totalFeesPaid)}</span>
          <span className="text-xs text-gray-500">
            Outstanding: {formatKES(totalFeesOutstanding)}
          </span>
        </div>

        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Invoices - total issued</span>
          <span className="text-lg font-semibold">{formatKES(totalInvoiced)}</span>
          <span className="text-xs text-gray-500">Paid: {formatKES(totalInvoicePaid)}</span>
          <span className="text-xs text-gray-500">
            Outstanding: {formatKES(totalInvoiceOutstanding)}
          </span>
        </div>

        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Expenses - total</span>
          <span className="text-lg font-semibold">{formatKES(totalExpenses)}</span>
        </div>

        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Net cash (invoice payments minus expenses)</span>
          <span className="text-lg font-semibold">
            {formatKES(totalInvoicePaid - totalExpenses)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Budget vs actual - income (fees)</span>
          <span className="text-xs text-gray-500">
            Budgeted: {formatKES(budgetIncomeTotal)}
          </span>
          <span className="text-xs text-gray-500">
            Actual: {formatKES(totalFeesPaid)}
          </span>
          <span className="text-xs text-gray-500">
            Variance: {formatKES(incomeVariance)}
          </span>
        </div>

        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Budget vs actual - expenses</span>
          <span className="text-xs text-gray-500">
            Budgeted: {formatKES(budgetExpensesTotal)}
          </span>
          <span className="text-xs text-gray-500">
            Actual: {formatKES(totalExpenses)}
          </span>
          <span className="text-xs text-gray-500">
            Variance: {formatKES(expenseVariance)}
          </span>
        </div>

        <div className="p-4 rounded-md ring-1 ring-gray-200 bg-white flex flex-col gap-1">
          <span className="text-xs text-gray-500">Budget vs actual - staff costs</span>
          <span className="text-xs text-gray-500">
            Budgeted: {formatKES(budgetStaffTotal)}
          </span>
          <span className="text-xs text-gray-500">
            Actual: {formatKES(totalStaffPayroll)}
          </span>
          <span className="text-xs text-gray-500">
            Variance: {formatKES(staffVariance)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ReportLinkCard
          title="Collections summary"
          description="By class and grade, with CSV export."
          href="/finance/collections"
        />
        <ReportLinkCard
          title="Aging report"
          description="Buckets of overdue fees across the school."
          href="/finance/aging"
        />
        <ReportLinkCard
          title="Clearance by class and grade"
          description="Term-by-term clearance for classes and grades."
          href="/finance/clearance"
        />
        <ReportLinkCard
          title="Debtors list"
          description="Students with outstanding invoices, sortable by balance."
          href="/finance/debtors"
        />
        <ReportLinkCard
          title="Expenses ledger"
          description="All recorded expenses with categories."
          href="/finance/expenses"
        />
        <ReportLinkCard
          title="Payroll periods"
          description="Monthly payroll summary and staff details."
          href="/finance/payroll"
        />
      </div>
    </div>
  );
}

type ReportLinkCardProps = {
  title: string;
  description: string;
  href: string;
};

function ReportLinkCard({ title, description, href }: ReportLinkCardProps) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-md ring-1 ring-gray-200 bg-white hover:bg-lamaSkyLight transition-colors"
    >
      <h2 className="text-sm font-semibold mb-1">{title}</h2>
      <p className="text-xs text-gray-600 mb-2">{description}</p>
      <span className="text-xs text-blue-600 font-medium">View report</span>
    </Link>
  );
}

