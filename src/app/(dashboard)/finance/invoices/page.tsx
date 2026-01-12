import prisma from "@/lib/prisma";
import InvoiceForm from "@/components/forms/InvoiceForm";
import PaymentForm from "@/components/forms/PaymentForm";
import { ensurePermission } from "@/lib/authz";
import Breadcrumbs from "@/components/Breadcrumbs";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export default async function InvoicesPage() {
  await ensurePermission("fees.read");

  type PaymentRow = { amount: number };
  type InvoiceRow = {
    id: number;
    studentId: string;
    term: "TERM1" | "TERM2" | "TERM3";
    dueDate: Date;
    totalAmount: number;
    status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
    payments: PaymentRow[];
  };
  type InvoiceFindManyArgs = { orderBy: { id: "desc" }; select: { id: true; studentId: true; term: true; dueDate: true; totalAmount: true; status: true; payments: { select: { amount: true } } } };
  type FinancePrisma = { invoice: { findMany: (args: InvoiceFindManyArgs) => Promise<InvoiceRow[]> } };
  const financePrisma = prisma as unknown as FinancePrisma;

  const invoices = await financePrisma.invoice.findMany({
    orderBy: { id: "desc" },
    select: { id: true, studentId: true, term: true, dueDate: true, totalAmount: true, status: true, payments: { select: { amount: true } } },
  });

  const withOutstanding = invoices.map((inv) => {
    const paid = inv.payments.reduce((sum: number, p: PaymentRow) => sum + p.amount, 0);
    const outstanding = Math.max(inv.totalAmount - paid, 0);
    return { ...inv, paid, outstanding };
  });

  const debtors = withOutstanding.filter((x) => x.outstanding > 0);

  return (
    <div className="p-4 flex flex-col gap-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Finance", href: "/finance/invoices" },
        { label: "Invoices" },
      ]} />
      <h1 className="text-xl font-semibold">Invoices</h1>
      <InvoiceForm />
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Student</th>
              <th className="py-2 pr-4">Term</th>
              <th className="py-2 pr-4">Due</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Paid</th>
              <th className="py-2 pr-4">Outstanding</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Record Payment</th>
            </tr>
          </thead>
          <tbody>
            {withOutstanding.map((inv) => (
              <tr key={inv.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">{inv.id}</td>
                <td className="py-2 pr-4">{inv.studentId}</td>
                <td className="py-2 pr-4">{inv.term}</td>
                <td className="py-2 pr-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{formatKES(inv.totalAmount)}</td>
                <td className="py-2 pr-4">{formatKES(inv.paid)}</td>
                <td className="py-2 pr-4">{formatKES(inv.outstanding)}</td>
                <td className="py-2 pr-4">{inv.status}</td>
                <td className="py-2 pr-4">
                  <PaymentForm invoiceId={inv.id} />
                </td>
              </tr>
            ))}
            {withOutstanding.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-center text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-semibold mt-6">Debtors</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((d) => (
                <tr key={d.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{d.id}</td>
                  <td className="py-2 pr-4">{d.studentId}</td>
                  <td className="py-2 pr-4">{formatKES(d.outstanding)}</td>
                </tr>
              ))}
              {debtors.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">
                    No debtors at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
