import * as Sentry from "@sentry/nextjs";
import { envClient } from "@/lib/env.client";

Sentry.init({
  ...(envClient.NEXT_PUBLIC_SENTRY_DSN ? { dsn: envClient.NEXT_PUBLIC_SENTRY_DSN } : {}),
  tracesSampleRate: 0.1,
});
