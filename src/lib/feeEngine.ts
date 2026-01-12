export type Term = "TERM1" | "TERM2" | "TERM3";

export type StudentFeeStatus = "unpaid" | "partially_paid" | "paid";

export interface ExistingStudentFee {
  amountDue: number; // minor units
  amountPaid: number; // minor units
  locked: boolean;
  status: StudentFeeStatus;
}

export interface ApplyInput {
  existing: ExistingStudentFee | null;
  newAmountDue: number; // minor units from structure line
}

export interface ApplyResult {
  amountDue: number;
  amountPaid: number;
  locked: boolean;
  status: StudentFeeStatus;
  changed: boolean;
}

const computeStatus = (amountDue: number, amountPaid: number): StudentFeeStatus => {
  if (amountPaid <= 0) return amountDue <= 0 ? "paid" : "unpaid";
  if (amountPaid >= amountDue) return "paid";
  return "partially_paid";
};

export function applyStructureChange(input: ApplyInput): ApplyResult {
  const { existing, newAmountDue } = input;

  // No existing row: create
  if (!existing) {
    const status = computeStatus(newAmountDue, 0);
    return {
      amountDue: newAmountDue,
      amountPaid: 0,
      locked: false,
      status,
      changed: true,
    };
  }

  // Overpayment vs new amount → lock row, keep paid, mark paid
  if (existing.amountPaid > newAmountDue) {
    return {
      amountDue: newAmountDue,
      amountPaid: existing.amountPaid,
      locked: true,
      status: "paid",
      changed: existing.locked === false || existing.amountDue !== newAmountDue || existing.status !== "paid",
    };
  }

  // If already locked, do not change money values
  if (existing.locked) {
    return {
      amountDue: existing.amountDue,
      amountPaid: existing.amountPaid,
      locked: true,
      status: existing.status,
      changed: false,
    };
  }

  // Normal update: update amountDue and recompute status
  const nextStatus = computeStatus(newAmountDue, existing.amountPaid);
  const changed = existing.amountDue !== newAmountDue || existing.status !== nextStatus;
  return {
    amountDue: newAmountDue,
    amountPaid: existing.amountPaid,
    locked: false,
    status: nextStatus,
    changed,
  };
}
