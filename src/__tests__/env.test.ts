import { describe, expect, it } from "vitest";
import { envSchema } from "@/lib/env";

describe("envSchema", () => {
  it("parses valid env", () => {
    const parsed = envSchema.parse({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXTAUTH_SECRET: "1234567890123456",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    expect(parsed.NODE_ENV).toBe("test");
  });

  it("rejects too-short NEXTAUTH_SECRET", () => {
    expect(() =>
      envSchema.parse({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        NEXTAUTH_SECRET: "short",
      }),
    ).toThrow();
  });
});
