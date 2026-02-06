import { ensurePermission } from "@/lib/authz";
import prisma from "@/lib/prisma";
import { PrintReceiptToolbar } from "@/components/finance/PrintReceiptToolbar";

import type { PayrollPeriodStatus } from "@/lib/payroll.actions";

type RouteParams = {
  periodId: string | string[] | undefined;
};

type PageProps = {
  params?: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

const formatMonth = (month: number): string => {
  return new Date(2000, month - 1, 1).toLocaleString(undefined, { month: "long" });
};

type PayrollPeriodRow = {
  id: number;
  year: number;
  month: number;
  status: PayrollPeriodStatus;
};

type StaffWithAccountRow = {
  firstName: string;
  lastName: string;
  email: string | null;
};

type StaffPayrollRow = {
  id: number;
  netPay: number;
  staff: StaffWithAccountRow;
};

type StaffPayrollOrderBy = {
  id?: "asc" | "desc";
};

type PayrollPeriodFindUniqueArgs = {
  where: { id: number };
  select: { id: true; year: true; month: true; status: true };
};

type StaffPayrollFindManyArgs = {
  where: { periodId: number };
  select: {
    id: true;
    netPay: true;
    staff: {
      select: {
        firstName: true;
        lastName: true;
        email: true;
      };
    };
  };
  orderBy: StaffPayrollOrderBy[];
};

type SchoolSettingsRow = {
  schoolName: string | null;
};

type SchoolSettingsFindUniqueArgs = {
  where: { id: number };
  select: { schoolName: true };
};

type PayrollPrintPrisma = {
  payrollPeriod: {
    findUnique: (args: PayrollPeriodFindUniqueArgs) => Promise<PayrollPeriodRow | null>;
  };
  staffPayroll: {
    findMany: (args: StaffPayrollFindManyArgs) => Promise<StaffPayrollRow[]>;
  };
  schoolSettings: {
    findUnique: (args: SchoolSettingsFindUniqueArgs) => Promise<SchoolSettingsRow | null>;
  };
};

export const dynamic = 'force-dynamic';

export default async function PayrollPrintPage({ params }: PageProps) {
  await ensurePermission("payroll.read");

  const resolvedParams = params ? await params : { periodId: undefined };
  const periodIdRaw = toSingleValue(resolvedParams.periodId);

  if (!periodIdRaw) {
    return (
      <div className="p-4 text-sm text-red-600">Missing payroll period id.</div>
    );
  }

  const periodId = Number.parseInt(periodIdRaw, 10);

  if (!Number.isFinite(periodId) || periodId <= 0) {
    return (
      <div className="p-4 text-sm text-red-600">Invalid payroll period id.</div>
    );
  }

  const payrollPrisma = prisma as unknown as PayrollPrintPrisma;

  const period = await payrollPrisma.payrollPeriod.findUnique({
    where: { id: periodId },
    select: { id: true, year: true, month: true, status: true },
  });

  if (!period) {
    return (
      <div className="p-4 text-sm text-red-600">Payroll period not found.</div>
    );
  }

  if (period.status !== "APPROVED" && period.status !== "PAID") {
    return (
      <div className="p-4 text-sm text-red-600">
        Payroll period must be APPROVED or PAID to print.
      </div>
    );
  }

  const [rows, settings] = await Promise.all([
    payrollPrisma.staffPayroll.findMany({
      where: { periodId },
      select: {
        id: true,
        netPay: true,
        staff: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ id: "asc" }],
    }),
    payrollPrisma.schoolSettings.findUnique({
      where: { id: 1 },
      select: { schoolName: true },
    }),
  ]);

  const totalNet = rows.reduce((sum, row) => sum + row.netPay, 0);

  const schoolName = settings?.schoolName ?? "School";

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background-color: white;
          }

          .no-print {
            display: none;
          }
        }
      `}</style>
      <PrintReceiptToolbar />
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-2">
          Payroll for {formatMonth(period.month)} {period.year}
        </h1>
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">School:</span> {schoolName}
        </div>
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">Status:</span> {period.status}
        </div>
        <div className="text-sm text-gray-700 mb-4">
          <span className="font-semibold">Total Net Pay:</span> {formatKES(totalNet)}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Account number</th>
                <th className="py-2 pr-4">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{row.id}</td>
                  <td className="py-2 pr-4">{`${row.staff.firstName} ${row.staff.lastName}`}</td>
                  <td className="py-2 pr-4">{row.staff.email ?? ""}</td>
                  <td className="py-2 pr-4">{formatKES(row.netPay)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No staff payroll rows for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
