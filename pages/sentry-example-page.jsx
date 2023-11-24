import Head from "next/head";
import * as Sentry from "@sentry/nextjs";

export default function Page() {
  return (
    <div>
      <Head>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          style={{
            padding: "12px",
            cursor: "pointer",
            backgroundColor: "#AD6CAA",
            borderRadius: "4px",
            border: "none",
            color: "white",
            fontSize: "14px",
            margin: "18px",
          }}
          onClick={async () => {
            const transaction = Sentry.startTransaction({
              name: "Example Frontend Transaction",
            });

            Sentry.configureScope((scope) => {
              scope.setSpan(transaction);
            });

            try {
              const res = await fetch("/api/sentry-example-api");
              if (!res.ok) {
                throw new Error("Sentry Example Frontend Error");
              }
            } finally {
              transaction.finish();
            }
          }}
        >
          Throw error!
        </button>
      </main>
    </div>
  );
}
