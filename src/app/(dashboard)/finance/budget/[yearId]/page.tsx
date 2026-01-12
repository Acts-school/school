import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const MONTH_NAMES: ReadonlyArray<string> = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type BudgetDetailPageProps = {
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

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  await ensurePermission("budget.read");

  const resolvedParams = params ? await params : {};

  const yearIdRaw = toSingleValue(resolvedParams.yearId);
  const id = yearIdRaw ? Number.parseInt(yearIdRaw, 10) : Number.NaN;
  if (!Number.isFinite(id)) {
    throw new Error("Invalid budget id");
  }

  const budget = await prisma.budgetYear.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            include: {
              amounts: true,
              staff: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!budget) {
    throw new Error("Budget not found");
  }

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

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/fees" },
          { label: "Budgets", href: "/finance/budget" },
          { label: budget.label },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Budget for {budget.label}</h1>
          <p className="text-sm text-gray-700">
            Status: <span className="font-semibold">{budget.status}</span>
          </p>
          <p className="text-sm text-gray-700">
            Total income: {formatKES(totalIncome)} | Total expenses: {formatKES(totalExpenses)} |
            Surplus/deficit: {formatKES(surplus)}
          </p>
          <p className="text-sm text-gray-700">
            Staff cost share of expenses: {staffShare.toFixed(1)}%
          </p>
        </div>
      </div>

      {budget.notes && (
        <div className="p-3 rounded-md bg-gray-50 text-sm text-gray-700">
          <div className="font-semibold mb-1">Notes</div>
          <div>{budget.notes}</div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {budget.sections.map((section) => {
          const sectionTotal = section.items.reduce((sectionSum, item) => {
            const itemTotal = item.amounts.reduce((sum, amount) => sum + amount.amount, 0);
            return sectionSum + itemTotal;
          }, 0);

          return (
            <div key={section.id} className="border rounded-md bg-white">
              <div className="px-4 py-2 border-b flex items-center justify-between">
                <div className="font-semibold text-sm">{section.name}</div>
                <div className="text-xs text-gray-600">Total: {formatKES(sectionTotal)}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 px-4">Item</th>
                      <th className="py-2 px-4">Type</th>
                      <th className="py-2 px-4">Linked Staff</th>
                      {MONTH_NAMES.map((name) => (
                        <th key={name} className="py-2 px-2 text-right">
                          {name}
                        </th>
                      ))}
                      <th className="py-2 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => {
                      const monthlyByMonthIndex: number[] = Array.from({ length: 12 }, () => 0);
                      item.amounts.forEach((amount) => {
                        const monthIndex = amount.month - 1;
                        if (monthIndex >= 0 && monthIndex < 12) {
                          const current = monthlyByMonthIndex[monthIndex] ?? 0;
                          monthlyByMonthIndex[monthIndex] = current + amount.amount;
                        }
                      });

                      const itemTotal = monthlyByMonthIndex.reduce((sum, value) => sum + value, 0);

                      const staffName = item.staff
                        ? `${item.staff.firstName} ${item.staff.lastName}`
                        : "-";

                      return (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="py-2 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium">{item.name}</span>
                              {item.notes && (
                                <span className="text-[11px] text-gray-500">{item.notes}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-4">{item.kind}</td>
                          <td className="py-2 px-4">{staffName}</td>
                          {monthlyByMonthIndex.map((value, index) => (
                            <td key={index} className="py-2 px-2 text-right">
                              {value === 0 ? "-" : formatKES(value)}
                            </td>
                          ))}
                          <td className="py-2 px-4 text-right">{formatKES(itemTotal)}</td>
                        </tr>
                      );
                    })}
                    {section.items.length === 0 && (
                      <tr>
                        <td colSpan={4 + MONTH_NAMES.length} className="py-4 text-center text-gray-500">
                          No items in this section.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {budget.sections.length === 0 && (
          <div className="py-4 text-center text-gray-500 text-sm">
            No sections defined for this budget yet.
          </div>
        )}
      </div>
    </div>
  );
}
