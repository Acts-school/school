import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  SENTRY_DSN: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

const rawNodeEnv = process.env.NODE_ENV;
const isTestEnv = rawNodeEnv === "test";

export const envServer: ServerEnv = serverSchema.parse({
  NODE_ENV: rawNodeEnv,
  // In test environments (e.g. Vitest on CI), allow running without real secrets
  // by providing deterministic dummy values. In dev/prod, missing values still
  // cause validation to fail as expected.
  DATABASE_URL: isTestEnv
    ? process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/testdb"
    : process.env.DATABASE_URL,
  NEXTAUTH_SECRET: isTestEnv
    ? process.env.NEXTAUTH_SECRET ?? "test-nextauth-secret-123456"
    : process.env.NEXTAUTH_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN,
});
