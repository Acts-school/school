import { describe, it, expect } from "vitest";
import { applyStructureChange, type ExistingStudentFee } from "@/lib/feeEngine";

describe("feeEngine.applyStructureChange", () => {
  it("creates a new unpaid row when amount > 0", () => {
    const res = applyStructureChange({ existing: null, newAmountDue: 5000 });
    expect(res).toEqual({ amountDue: 5000, amountPaid: 0, locked: false, status: "unpaid", changed: true });
  });

  it("creates a new paid row when amount == 0", () => {
    const res = applyStructureChange({ existing: null, newAmountDue: 0 });
    expect(res).toEqual({ amountDue: 0, amountPaid: 0, locked: false, status: "paid", changed: true });
  });

  it("locks when existing paid exceeds new amount", () => {
    const existing: ExistingStudentFee = { amountDue: 6000, amountPaid: 7000, locked: false, status: "paid" };
    const res = applyStructureChange({ existing, newAmountDue: 5000 });
    expect(res.locked).toBe(true);
    expect(res.status).toBe("paid");
    expect(res.amountDue).toBe(5000);
    expect(res.amountPaid).toBe(7000);
    expect(res.changed).toBe(true);
  });

  it("keeps values when locked", () => {
    const existing: ExistingStudentFee = { amountDue: 6000, amountPaid: 1000, locked: true, status: "partially_paid" };
    const res = applyStructureChange({ existing, newAmountDue: 5000 });
    expect(res.locked).toBe(true);
    expect(res.amountDue).toBe(6000);
    expect(res.amountPaid).toBe(1000);
    expect(res.status).toBe("partially_paid");
    expect(res.changed).toBe(false);
  });

  it("updates amount and status to partially_paid when paid < new", () => {
    const existing: ExistingStudentFee = { amountDue: 6000, amountPaid: 1000, locked: false, status: "unpaid" };
    const res = applyStructureChange({ existing, newAmountDue: 5000 });
    expect(res.locked).toBe(false);
    expect(res.amountDue).toBe(5000);
    expect(res.amountPaid).toBe(1000);
    expect(res.status).toBe("partially_paid");
    expect(res.changed).toBe(true);
  });

  it("updates status to paid when paid == new", () => {
    const existing: ExistingStudentFee = { amountDue: 6000, amountPaid: 5000, locked: false, status: "partially_paid" };
    const res = applyStructureChange({ existing, newAmountDue: 5000 });
    expect(res.status).toBe("paid");
    expect(res.changed).toBe(true);
  });
});
