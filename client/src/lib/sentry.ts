import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  // Only pass dsn when it's a real value — passing an empty string triggers a warning
  ...(sentryDsn ? { dsn: sentryDsn } : {}),
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
  enabled: !!sentryDsn,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

export default Sentry;
