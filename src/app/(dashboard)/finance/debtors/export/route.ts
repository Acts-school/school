import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";

// GET /finance/debtors/export -> CSV
export async function GET(request: Request): Promise<Response> {
  await ensurePermission("fees.read");

  type PaymentRow = { amount: number };
  type InvoiceRow = {
    id: number;
    studentId: string;
    student: { name: string; surname: string };
    term: "TERM1" | "TERM2" | "TERM3";
    dueDate: Date;
    totalAmount: number;
    payments: PaymentRow[];
  };
  type InvoiceFindManyArgs = {
    where?: {
      term?: "TERM1" | "TERM2" | "TERM3";
      student?: { gradeId?: number; classId?: number };
    };
    select: { id: true; studentId: true; term: true; dueDate: true; totalAmount: true; student: { select: { name: true; surname: true } }; payments: { select: { amount: true } } };
  };
  type FinancePrisma = { invoice: { findMany: (args: InvoiceFindManyArgs) => Promise<InvoiceRow[]> } };
  const financePrisma = prisma as unknown as FinancePrisma;

  const url = new URL(request.url);
  const term = url.searchParams.get("term") as InvoiceRow["term"] | null;
  const gradeId = url.searchParams.get("gradeId");
  const classId = url.searchParams.get("classId");

  const where: InvoiceFindManyArgs["where"] = {
    ...(term ? { term } : {}),
    ...(gradeId || classId ? { student: {
      ...(gradeId ? { gradeId: Number(gradeId) } : {}),
      ...(classId ? { classId: Number(classId) } : {}),
    } } : {}),
  };

  const invoices = await financePrisma.invoice.findMany({
    where,
    select: { id: true, studentId: true, term: true, dueDate: true, totalAmount: true, student: { select: { name: true, surname: true } }, payments: { select: { amount: true } } },
  });

  const rows = invoices
    .map((inv) => {
      const paid = inv.payments.reduce((sum: number, p: PaymentRow) => sum + p.amount, 0);
      const outstanding = Math.max(inv.totalAmount - paid, 0);
      return { ...inv, paid, outstanding };
    })
    .filter((x) => x.outstanding > 0);

  const escape = (v: string) => '"' + v.replace(/"/g, '""') + '"';
  const header = [
    "id",
    "student",
    "term",
    "dueDate",
    "totalAmount_minor",
    "paid_minor",
    "outstanding_minor",
    "totalAmount_kes",
    "paid_kes",
    "outstanding_kes",
  ]; 
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      String(r.id),
      escape(`${r.student.name} ${r.student.surname}`),
      r.term,
      new Date(r.dueDate).toISOString(),
      String(r.totalAmount),
      String(r.paid),
      String(r.outstanding),
      ((r.totalAmount ?? 0) / 100).toFixed(2),
      ((r.paid ?? 0) / 100).toFixed(2),
      ((r.outstanding ?? 0) / 100).toFixed(2),
    ].join(","));
  }
  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=debtors.csv",
      "Cache-Control": "no-store",
    },
  });
}
