import type { PaymentMethod } from "@prisma/client";

const formatKES = (minor: number): string => `KES ${((minor ?? 0) / 100).toFixed(2)}`;

export type ThermalReceiptProps = {
  schoolName: string;
  receiptId: number;
  paymentAmountMinor: number;
  totalAmountMinor: number;
  paidAmountMinor: number;
  balanceMinor: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
  studentName: string;
  studentUsername: string;
  className: string | null;
  gradeLevel: number | null;
  academicYear: number | null;
  termLabel: string | null;
};

export function ThermalReceipt(props: ThermalReceiptProps) {
  const {
    schoolName,
    receiptId,
    paymentAmountMinor,
    totalAmountMinor,
    paidAmountMinor,
    balanceMinor,
    method,
    reference,
    paidAt,
    studentName,
    studentUsername,
    className,
    gradeLevel,
    academicYear,
    termLabel,
  } = props;

  return (
    <div className="w-full max-w-xs mx-auto px-2 py-3">
      <div className="text-center mb-2">
        <div className="text-sm font-semibold leading-tight">{schoolName}</div>
        <div className="text-[10px]">Fee Payment Receipt</div>
      </div>

      <div className="text-[10px] mb-2">
        <div className="flex justify-between">
          <span>Receipt #</span>
          <span>{String(receiptId).padStart(6, "0")}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{paidAt.toLocaleString()}</span>
        </div>
        {termLabel || academicYear ? (
          <div className="flex justify-between">
            <span>Term / Year</span>
            <span>
              {termLabel ?? "-"} {academicYear ? `· ${academicYear}` : ""}
            </span>
          </div>
        ) : null}
      </div>

      <div className="border-t border-dashed border-gray-400 my-1" />

      <div className="text-[10px] mb-2">
        <div className="font-semibold mb-1">Student</div>
        <div className="flex justify-between">
          <span>Name</span>
          <span>{studentName}</span>
        </div>
        <div className="flex justify-between">
          <span>Adm</span>
          <span>{studentUsername}</span>
        </div>
        <div className="flex justify-between">
          <span>Class</span>
          <span>{className ?? "-"}</span>
        </div>
        <div className="flex justify-between">
          <span>Grade</span>
          <span>{gradeLevel ?? "-"}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-1" />

      <div className="text-[10px] mb-2">
        <div className="font-semibold mb-1">Payment</div>
        <div className="flex justify-between">
          <span>Amount</span>
          <span>{formatKES(paymentAmountMinor)}</span>
        </div>
        <div className="flex justify-between">
          <span>Method</span>
          <span>{method}</span>
        </div>
        {reference ? (
          <div className="flex justify-between">
            <span>Reference</span>
            <span>{reference}</span>
          </div>
        ) : null}
      </div>

      <div className="border-t border-dashed border-gray-400 my-1" />

      <div className="text-[10px] mb-2">
        <div className="font-semibold mb-1">Totals</div>
        <div className="flex justify-between">
          <span>Total</span>
          <span>{formatKES(totalAmountMinor)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{formatKES(paidAmountMinor)}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance</span>
          <span>{formatKES(balanceMinor)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 my-1" />

      <div className="text-[10px] text-center mt-1">
        <div>Thank you for your payment.</div>
        <div>Please keep this receipt for your records.</div>
      </div>
    </div>
  );
}
