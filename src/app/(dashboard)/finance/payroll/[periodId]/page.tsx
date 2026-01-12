import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";
import StaffPayrollRowForm from "@/components/forms/StaffPayrollRowForm";
import ClosePayrollPeriodButton from "@/components/ClosePayrollPeriodButton";
import PrefillPayrollFromBudgetButton from "@/components/PrefillPayrollFromBudgetButton";
import type { PaymentMethod } from "@/lib/fees.actions";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const formatMonth = (month: number): string => {
  return new Date(2000, month - 1, 1).toLocaleString(undefined, { month: "long" });
};

type PayrollPeriodPageProps = {
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

export default async function PayrollPeriodDetailPage({
  params,
}: PayrollPeriodPageProps) {
  await ensurePermission("payroll.read");

  const resolvedParams = params ? await params : {};

  const periodIdRaw = toSingleValue(resolvedParams.periodId);
  const periodId = periodIdRaw ? Number.parseInt(periodIdRaw, 10) : Number.NaN;
  if (!Number.isFinite(periodId)) {
    throw new Error("Invalid payroll period id");
  }

  type PayrollPeriodRow = {
    id: number;
    year: number;
    month: number;
    status: "OPEN" | "APPROVED" | "PAID" | "CANCELLED";
    schoolId: number | null;
  };

  type StaffPick = {
    id: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "TEACHER" | "ACCOUNTANT" | "NON_TEACHING" | "SUPPORT" | "OTHER";
  };

  type StaffPayrollRow = {
    id: number;
    staff: StaffPick;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netPay: number;
    status: "DRAFT" | "APPROVED" | "PAID";
    paymentMethod: PaymentMethod | null;
    paymentReference: string | null;
    paidAt: Date | null;
  };

  type StaffPayrollOrderBy = {
    id?: "asc" | "desc";
  };

  type PayrollPeriodFindUniqueArgs = {
    where: { id: number };
    select: { id: true; year: true; month: true; status: true; schoolId: true };
  };

  type StaffPayrollFindManyArgs = {
    where: { periodId: number };
    select: {
      id: true;
      basicSalary: true;
      allowances: true;
      deductions: true;
      netPay: true;
      status: true;
      paymentMethod: true;
      paymentReference: true;
      paidAt: true;
      staff: {
        select: {
          id: true;
          firstName: true;
          lastName: true;
          role: true;
        };
      };
    };
    orderBy: StaffPayrollOrderBy[];
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

  type PayrollPrisma = {
    payrollPeriod: {
      findUnique: (args: PayrollPeriodFindUniqueArgs) => Promise<PayrollPeriodRow | null>;
    };
    staffPayroll: {
      findMany: (args: StaffPayrollFindManyArgs) => Promise<StaffPayrollRow[]>;
    };
    budgetYear: {
      findFirst: (args: BudgetYearFindFirstArgs) => Promise<BudgetYearRow | null>;
    };
  };

  const payrollPrisma = prisma as unknown as PayrollPrisma;

  const period = await payrollPrisma.payrollPeriod.findUnique({
    where: { id: periodId },
    select: { id: true, year: true, month: true, status: true, schoolId: true },
  });

  if (!period) {
    throw new Error("Payroll period not found");
  }

  const [rows, approvedBudgetYear] = await Promise.all([
    payrollPrisma.staffPayroll.findMany({
      where: { periodId },
      select: {
        id: true,
        basicSalary: true,
        allowances: true,
        deductions: true,
        netPay: true,
        status: true,
        paymentMethod: true,
        paymentReference: true,
        paidAt: true,
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: [{ id: "asc" }],
    }),
    payrollPrisma.budgetYear.findFirst({
      where: {
        academicYear: period.year,
        status: "APPROVED",
        schoolId: period.schoolId ?? null,
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

  const totalNet = rows.reduce((sum, r) => sum + r.netPay, 0);

  let budgetStaffForPeriod = 0;
  if (approvedBudgetYear) {
    for (const section of approvedBudgetYear.sections) {
      for (const item of section.items) {
        if (item.kind !== "STAFF") {
          continue;
        }

        for (const amount of item.amounts) {
          if (amount.month === period.month) {
            budgetStaffForPeriod += amount.amount;
          }
        }
      }
    }
  }

  const staffVariance = totalNet - budgetStaffForPeriod;

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/payroll" },
          { label: "Payroll", href: "/finance/payroll" },
          { label: `${formatMonth(period.month)} ${period.year}` },
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            Payroll for {formatMonth(period.month)} {period.year}
          </h1>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">Status:</span> {period.status}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">Total Net Pay:</span> {formatKES(totalNet)}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">Budgeted staff cost (approved budget):</span>{" "}
            {formatKES(budgetStaffForPeriod)}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">Variance (actual - budget):</span>{" "}
            {formatKES(staffVariance)}
          </div>
        </div>
        <div className="flex flex-row gap-2">
          {period.status === "OPEN" && (
            <PrefillPayrollFromBudgetButton periodId={period.id} />
          )}
          {period.status !== "PAID" && period.status !== "CANCELLED" && (
            <ClosePayrollPeriodButton periodId={period.id} />
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Staff</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Basic</th>
              <th className="py-2 pr-4">Allowances</th>
              <th className="py-2 pr-4">Deductions</th>
              <th className="py-2 pr-4">Net Pay</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Last Payment</th>
              <th className="py-2 pr-4">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{r.id}</td>
                <td className="py-2 pr-4">{`${r.staff.firstName} ${r.staff.lastName}`}</td>
                <td className="py-2 pr-4">{r.staff.role}</td>
                <td className="py-2 pr-4">{formatKES(r.basicSalary)}</td>
                <td className="py-2 pr-4">{formatKES(r.allowances)}</td>
                <td className="py-2 pr-4">{formatKES(r.deductions)}</td>
                <td className="py-2 pr-4">{formatKES(r.netPay)}</td>
                <td className="py-2 pr-4">{r.status}</td>
                <td className="py-2 pr-4">
                  {r.paidAt
                    ? `${r.paymentMethod ?? ""} on ${new Date(r.paidAt).toLocaleDateString()}`
                    : "-"}
                </td>
                <td className="py-2 pr-4 align-top">
                  <StaffPayrollRowForm
                    id={r.id}
                    basicSalaryMinor={r.basicSalary}
                    allowancesMinor={r.allowances}
                    deductionsMinor={r.deductions}
                    status={r.status}
                    paymentMethod={r.paymentMethod}
                    paymentReference={r.paymentReference}
                    paidAtIso={r.paidAt ? new Date(r.paidAt).toISOString().slice(0, 16) : null}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-500">
                  No staff payroll rows for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
