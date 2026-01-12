import prisma from "@/lib/prisma";
import { ensurePermission, getCurrentSchoolContext } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";
import PayrollPeriodForm from "@/components/forms/PayrollPeriodForm";

const formatMonth = (month: number): string => {
  return new Date(2000, month - 1, 1).toLocaleString(undefined, { month: "long" });
};

export default async function PayrollPage() {
  await ensurePermission("payroll.read");

  type PayrollPeriodRow = {
    id: number;
    year: number;
    month: number;
    status: "OPEN" | "APPROVED" | "PAID" | "CANCELLED";
  };

  type PayrollPeriodOrderBy = {
    year?: "asc" | "desc";
    month?: "asc" | "desc";
  };

  type PayrollPeriodFindManyArgs = {
    where?: {
      schoolId?: number | null;
    };
    orderBy: PayrollPeriodOrderBy[];
  };

  type PayrollPrisma = {
    payrollPeriod: {
      findMany: (args: PayrollPeriodFindManyArgs) => Promise<PayrollPeriodRow[]>;
    };
  };

  const payrollPrisma = prisma as unknown as PayrollPrisma;

  const { schoolId } = await getCurrentSchoolContext();

  const baseArgs: PayrollPeriodFindManyArgs = {
    orderBy: [{ year: "desc" }, { month: "desc" }],
  };

  const args: PayrollPeriodFindManyArgs =
    schoolId !== null ? { ...baseArgs, where: { schoolId } } : baseArgs;

  const periods = await payrollPrisma.payrollPeriod.findMany(args);

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/finance/payroll" },
          { label: "Payroll" },
        ]}
      />
      <h1 className="text-xl font-semibold">Payroll Periods</h1>
      <PayrollPeriodForm />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Year</th>
              <th className="py-2 pr-4">Month</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{p.id}</td>
                <td className="py-2 pr-4">{p.year}</td>
                <td className="py-2 pr-4">{formatMonth(p.month)}</td>
                <td className="py-2 pr-4">{p.status}</td>
                <td className="py-2 pr-4">
                  <a
                    href={`/finance/payroll/${p.id}`}
                    className="text-xs text-blue-600 underline"
                  >
                    View details
                  </a>
                </td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No payroll periods yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
