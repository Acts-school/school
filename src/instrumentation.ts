import * as Sentry from "@sentry/nextjs";
import { envServer } from "@/lib/env.server";

export async function register(): Promise<void> {
  Sentry.init({
    ...(envServer.SENTRY_DSN ? { dsn: envServer.SENTRY_DSN } : {}),
    tracesSampleRate: 0.1,
  });
}
