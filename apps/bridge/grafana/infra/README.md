The existing Alloy → Tempo pipeline is sufficient for browser spans. Web Vitals,
clicks, form progress and operation timings use Faro → Loki; they do not require
Tempo or another collector.

Live development checks on 2026-09-10 confirmed Tempo health and backend trace
search. Grafana still provisions datasource **names** as cross-reference UIDs,
which breaks log/trace/metric navigation.

`tempo-datasource-links.patch` targets `layerswap/layerswap-fluxcd` at
`eb45fb06e3f002b391e4cab7dbf7ee3c04faf6b0`, in
`common/preinstalls/monitoring/kube-prometheus-stack.yaml`. It pins the three
existing development UIDs and uses them in all five cross-references. It passed
`git apply --check` against that revision. It has **not been applied or deployed**.

| Datasource | Verified development UID |
| --- | --- |
| Loki | `P8E80F9AEF21F6940` |
| Tempo | `P214B5B846CF3925F` |
| Prometheus | `PBFA97CFB590B2093` |

The common file is inherited by production. Before merging, read production's
datasources and verify its existing UIDs; if different, retain those UIDs in a
production override. Changing an existing UID can invalidate saved dashboards.
The patch preserves the existing trace-to-log tag mapping; browser Faro logs
may need a separate query using `traceID` because they do not carry the backend
pod/service labels. The new session dashboard links exact recorded trace IDs
directly to development Tempo, independently of that mapping.

For browser → API → backend traces, configure the frontend's
`NEXT_PUBLIC_FARO_TRACE_PROPAGATION_URLS` with only the API origins that accept
W3C context, then rebuild. The API CORS response must allow `traceparent` and
any other headers actually sent (for example `tracestate`), and backend tracing
must extract the incoming context. The existing code already supports this
configuration; no broader propagation allowlist is needed. Verify one fresh
request by its exact trace ID across browser and API spans before claiming
end-to-end tracing. Backend traces alone do not establish that connection.
