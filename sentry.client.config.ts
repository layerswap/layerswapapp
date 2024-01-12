// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ab04115a318589cc7c77fd3d48ce9bbb@o4506258334875648.ingest.sentry.io/4506258338217984",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  beforeSend(event, hint) {
    const extension_error = event.exception?.values?.some(e => e.stacktrace?.frames?.some(f => f.filename?.includes("app://")))
    const isKnownError = event.exception?.values?.some(e => known_errors.includes(e.value || ""))

    if (isKnownError || (event.transaction !== "error_boundary_handler" && extension_error))
      return null;
    return event;
  },
});


const known_errors = [
  "Cannot write private member to an object whose class did not declare it",
  "Socket stalled when trying to connect to wss://relay.walletconnect.org"
]
