import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export default async function BudgetListPage() {
  await ensurePermission("budget.read");

  const budgets = await prisma.budgetYear.findMany({
    orderBy: { academicYear: "desc" },
    include: {
      sections: {
        include: {
          items: {
            include: {
              amounts: true,
            },
          },
        },
      },
    },
  });

  const rows = budgets.map((budget) => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let staffExpenses = 0;

    budget.sections.forEach((section) => {
      section.items.forEach((item) => {
        const itemTotal = item.amounts.reduce((sum, amount) => sum + amount.amount, 0);
        if (item.kind === "INCOME") {
          totalIncome += itemTotal;
        } else {
          totalExpenses += itemTotal;
          if (item.kind === "STAFF") {
            staffExpenses += itemTotal;
          }
        }
      });
    });

    const surplus = totalIncome - totalExpenses;
    const staffShare = totalExpenses > 0 ? (staffExpenses / totalExpenses) * 100 : 0;

    return {
      budget,
      totalIncome,
      totalExpenses,
      surplus,
      staffShare,
    };
  });

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: "Budgets" },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Budgets</h1>
          <p className="text-sm text-gray-600">
            Annual budgets used as baselines for fees, expenses, payroll, and reports.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Year</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Total Income</th>
              <th className="py-2 pr-4">Total Expenses</th>
              <th className="py-2 pr-4">Surplus / Deficit</th>
              <th className="py-2 pr-4">Staff Cost %</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ budget, totalIncome, totalExpenses, surplus, staffShare }) => (
              <tr key={budget.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{budget.label}</td>
                <td className="py-2 pr-4">{budget.status}</td>
                <td className="py-2 pr-4">{formatKES(totalIncome)}</td>
                <td className="py-2 pr-4">{formatKES(totalExpenses)}</td>
                <td className="py-2 pr-4">{formatKES(surplus)}</td>
                <td className="py-2 pr-4">{staffShare.toFixed(1)}%</td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/finance/budget/${budget.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-gray-500">
                  No budgets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
