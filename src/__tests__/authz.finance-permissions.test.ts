import { describe, it, expect, vi, afterEach } from "vitest";

import { ensurePermission } from "@/lib/authz";
import type { BaseRole } from "@/lib/rbac";
import { getServerSession } from "next-auth";
import type { Mock } from "vitest";

vi.mock("next-auth", () => ({
  __esModule: true as const,
  getServerSession: vi.fn(),
  default: vi.fn(),
}));

const setMockSession = (role: BaseRole | null): void => {
  const mockedGetServerSession = getServerSession as unknown as Mock;

  if (role === null) {
    mockedGetServerSession.mockResolvedValue(null);
    return;
  }

  const session = {
    user: {
      id: "test-user-id",
      role,
    },
  };

  mockedGetServerSession.mockResolvedValue(session);
};

afterEach(() => {
  vi.resetAllMocks();
});

const financePermissions = [
  "fees.read",
  "fees.write",
  "payments.read",
  "payments.write",
  "expenses.read",
  "expenses.write",
  "payroll.read",
  "payroll.write",
] as const;

describe("ensurePermission finance/payroll permissions", () => {
  it("allows admin for all finance permissions", async () => {
    setMockSession("admin");

    for (const perm of financePermissions) {
      // eslint-disable-next-line no-await-in-loop
      await expect(ensurePermission(perm)).resolves.toBeUndefined();
    }
  });

  it("allows accountant for all finance permissions", async () => {
    setMockSession("accountant");

    for (const perm of financePermissions) {
      // eslint-disable-next-line no-await-in-loop
      await expect(ensurePermission(perm)).resolves.toBeUndefined();
    }
  });

  it("denies teacher finance permissions", async () => {
    setMockSession("teacher");

    for (const perm of financePermissions) {
      // eslint-disable-next-line no-await-in-loop
      await expect(ensurePermission(perm)).rejects.toThrow("Forbidden");
    }
  });

  it("denies student finance permissions", async () => {
    setMockSession("student");

    for (const perm of financePermissions) {
      // eslint-disable-next-line no-await-in-loop
      await expect(ensurePermission(perm)).rejects.toThrow("Forbidden");
    }
  });

  it("denies parent finance permissions", async () => {
    setMockSession("parent");

    for (const perm of financePermissions) {
      // eslint-disable-next-line no-await-in-loop
      await expect(ensurePermission(perm)).rejects.toThrow("Forbidden");
    }
  });

  it("throws Unauthorized when there is no auth context", async () => {
    setMockSession(null);

    for (const perm of financePermissions) {
      // eslint-disable-next-line no-await-in-loop
      await expect(ensurePermission(perm)).rejects.toThrow("Unauthorized");
    }
  });
});
