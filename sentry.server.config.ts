import * as Sentry from "@sentry/nextjs";
import { getEnv } from "@/lib/env";

Sentry.init({
  ...((() => { const env = getEnv(); return env.SENTRY_DSN ? { dsn: env.SENTRY_DSN } : {}; })()),
  tracesSampleRate: 0.1,
});
