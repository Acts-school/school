import * as Sentry from "@sentry/nextjs";
import { getEnvServer } from "@/lib/env.server";

export async function register(): Promise<void> {
  const envServer = getEnvServer();
  Sentry.init({
    ...(envServer.SENTRY_DSN ? { dsn: envServer.SENTRY_DSN } : {}),
    tracesSampleRate: 0.1,
  });
}
