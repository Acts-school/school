import * as Sentry from "@sentry/nextjs";
import { getEnvClient } from "@/lib/env.client";

const envClient = getEnvClient();

Sentry.init({
  ...(envClient.NEXT_PUBLIC_SENTRY_DSN ? { dsn: envClient.NEXT_PUBLIC_SENTRY_DSN } : {}),
  tracesSampleRate: 0.1,
});
