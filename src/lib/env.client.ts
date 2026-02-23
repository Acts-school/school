import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export type ClientEnv = z.infer<typeof clientSchema>;

let cachedEnvClient: ClientEnv | null = null;

export const getEnvClient = (): ClientEnv => {
  if (cachedEnvClient) {
    return cachedEnvClient;
  }

  cachedEnvClient = clientSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  return cachedEnvClient;
};
