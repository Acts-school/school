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

describe("ensurePermission with results.write", () => {
  it("allows admin to use results.write", async () => {
    setMockSession("admin");

    await expect(ensurePermission("results.write")).resolves.toBeUndefined();
  });

  it("allows teacher to use results.write", async () => {
    setMockSession("teacher");

    await expect(ensurePermission("results.write")).resolves.toBeUndefined();
  });

  it("denies student results.write (Forbidden)", async () => {
    setMockSession("student");

    await expect(ensurePermission("results.write")).rejects.toThrow(
      "Forbidden",
    );
  });

  it("denies parent results.write (Forbidden)", async () => {
    setMockSession("parent");

    await expect(ensurePermission("results.write")).rejects.toThrow(
      "Forbidden",
    );
  });

  it("throws Unauthorized when there is no auth context", async () => {
    setMockSession(null);

    await expect(ensurePermission("results.write")).rejects.toThrow(
      "Unauthorized",
    );
  });
});
