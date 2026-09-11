# Faro infrastructure audit — FluxCD repository

Inspected 2026-09-08, read-only, after the user supplied `layerswap/layerswap-fluxcd`. Repository `main` resolved to commit `53b7e74183c84b7395ba1b28fd1a4efd1724dbf8`. Twenty relevant README/monitoring/cluster-wiring files were read through authenticated GitHub access; credential values were redacted before output. No deployment changes, GitHub writes, production requests, new transactions or Tempo tests were performed.

This supersedes earlier **configuration unavailable** statements in the audit/Checkpoint B. It does not supersede observed payload/Loki evidence. Repository declarations are `Found only in source code`, not proof of applied cluster configuration or Tempo storage. Installed chart versions, Helm-rendered manifests, reconciliation status, external gateway policies and actual retention enforcement remain unverified.

## Configuration and routing found

Both environment monitoring Kustomizations include `common/preinstalls/monitoring`. Dev patches Alloy, Loki, Tempo and kube-prometheus-stack; production patches Alloy and kube-prometheus-stack, inheriting common Loki/Tempo values. The Alloy configuration is a complete string override in each environment, not a per-component merge. Cluster resources point at the corresponding dev/prod app trees.

| Area | Declared configuration | Evidence |
| --- | --- | --- |
| dev browser ingress | HTTPS host `faro.dev.lb.layerswap.cloud`, frontend/backend port 12347, prefix `/` → `grafana-alloy` service | [dev Faro ingress](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/dev/apps/external/monitoring/faro-ingress.yaml#L6) |
| production browser ingress | HTTPS host `faro.lb.layerswap.io`, frontend/backend port 12347 → same service name in its cluster | [production Faro ingress](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/prod/apps/external/monitoring/faro-ingress.yaml#L6) |
| Faro receiver | `faro.receiver "frontend"`, listen `0.0.0.0:12347` | [dev Alloy](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/dev/apps/external/monitoring/grafana-alloy.yaml#L360), [production Alloy](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/prod/apps/external/monitoring/grafana-alloy.yaml#L389) |
| Faro log path | receiver → `loki.write.faro.receiver` → `http://loki-gateway.monitoring.svc.cluster.local:80/loki/api/v1/push`; adds `source="faro"` | dev Alloy lines 367–380; production lines 396–409 |
| Faro span path | receiver → `otelcol.exporter.otlp.tempo.input` → `tempo.monitoring.svc.cluster.local:4317`, TLS `insecure=true` | dev Alloy lines 172–179/367–370; production lines 165–172/396–399 |
| application OTLP path | separate 4317/4318 receivers with k8s attributes, metric resource promotion, memory limiter/batch, and separate log export | dev Alloy lines 25–246; production lines 18–239 |
| pod log path | separate Kubernetes discovery/relabel → `loki.process.pod_logs` → `loki.write.default` | dev Alloy lines 251–355; production lines 244–384 |
| Grafana datasources | common provisioning defines Prometheus, Loki gateway and Tempo `http://tempo:3200`; sidecar datasource provisioning disabled | [common Grafana values](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/common/preinstalls/monitoring/kube-prometheus-stack.yaml#L117) |

The user's sole Faro setting remains `NEXT_PUBLIC_FARO_COLLECTOR_URL=https://faro.dev.lb.layerswap.cloud:12347/collect`; this audit introduces no additional environment requirement and does not recommend switching it to production during tests.

## What this establishes about field ownership

- `source="faro"` is explicitly added by **Alloy's `loki.write.faro.external_labels`**, consistent with the observed Loki stream label.
- Faro logs do **not** traverse the pod-log JSON parser, level-label promotion, 168-hour old-entry drop, OTLP log converter, or Kubernetes metadata processors. Do not attribute their `app_*`, `event_data_*`, `session_attr_*` fields to those unrelated processors.
- No custom Faro field rename/flatten/redaction processor, extra log-label mapping or timestamp stage is declared. The receiver leaves `log_format` unset; documented default is logfmt, consistent with stored lines. Exact serialization details still depend on the installed receiver version. [Faro receiver reference](https://grafana.com/docs/alloy/latest/reference/components/faro/faro.receiver/).
- `service_name=unknown_service`, `detected_level=unknown`, error hashes and exact timestamp policy still require installed-version/runtime inspection to attribute precisely. Their stored values remain verified by the earlier capture, not inferred from this repository.
- No declared promotion of wallet/session/journey/swap/trace identifiers to Faro stream labels was found. Keep the observed parsed fields searchable; do not promote them to labels or recording-rule dimensions.
- Faro spans bypass the separately declared batch/memory-limiter processors. No Faro head/tail sampling processor is declared. This is not evidence of 100% end-to-end delivery: browser sampling, rate limiting, exporter behavior and failures can still drop telemetry.

## CORS: configuration plus a fresh boundary check

Dev allows `https://*.layerswap.cloud`, `https://*.layerswap.io`, `http://localhost:*`, `https://localhost:*`. Production allows only the two HTTPS domain patterns. Neither declares `127.0.0.1` or an apex-domain origin explicitly.

Two OPTIONS requests to the user's dev collector at **12:22 UTC** requested POST with `content-type`:

| Origin | HTTP | Returned CORS permission |
| --- | --- | --- |
| `http://localhost:3000` | 204 | allow-origin equals that origin; allow-methods POST; allow-headers content-type |
| `http://127.0.0.1:3000` | 204 | no allow-origin/methods/headers |

Use `localhost:3000` for the existing manual capture workflow. This resolves the earlier origin-specific preflight mismatch; it does not retroactively prove a complete browser payload capture. Production origins were not probed. Collector CORS is separate from the Layerswap backend API CORS needed to propagate `traceparent` to API calls.

## Retention, authentication and production-safety findings

| Concern | Declared state | Recommendation / remaining verification |
| --- | --- | --- |
| dev Loki retention | 168h and compactor `retention_enabled=true`, filesystem deletion store | 7-day intent is explicit; verify rendered config and actual compactor deletion, not just values |
| production Loki retention | common `retention_period=720h`; no explicit compactor retention enable in common/prod values | cannot claim enforced 30-day deletion; operational approval needed to enable/choose retention and verify deletion |
| Tempo retention | dev 24h, inherited production/common 120h | source-only intent; Tempo remains deferred |
| Prometheus retention | dev 7d, common/production 15d | source-only intent; include derived metrics in data-lifetime review |
| Loki auth/tenants | common `auth_enabled=false`; Faro writer has no tenant override or auth block; internal HTTP destination | verify network isolation and gateway policies; no evidence of per-application tenant isolation |
| receiver auth/rate limits | no explicit `api_key`, payload cap, or `rate_limiting` block | do not call this unlimited: documented defaults include rate limiting; check installed version/effective limits, then choose operational budgets; CORS is not authentication |
| Grafana access | Azure AD/domain restrictions, hidden login form, default `auto_assign_org_role: Admin`; `adminPassword` setting exists (value withheld) | review default role and credential provisioning with operators; dev Editor token approval is separate from granting users Admin; effective runtime roles not inspected |
| receiver redaction | no Faro-specific server-side redaction pipeline | frontend sanitization remains material; implement approved URL/error policy with semantic OTLP handling, then re-capture |
| source maps | no explicit `sourcemaps` block | absence is not proof of disabled resolution: receiver docs describe automatic download defaults; constrain origins/egress and confirm release lookup/minified error resolution |
| generated metric cardinality | common Tempo values list `http.url` among span-metric dimensions in two configuration sections | remove full URLs from metric dimensions if confirmed applied; use bounded normalized routes, never wallet/swap/session IDs; do not treat declared metrics-generator keys as verified rendered config |
| upgrade reproducibility | broad chart constraints for Alloy, Loki and Tempo; dev kube-prometheus-stack pinned to 88.3.0 | capture actual resolved versions/digests and consider explicit pins through normal operations review |

Retention sources: [dev Loki](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/dev/apps/external/monitoring/loki.yaml#L9), [common Loki](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/common/preinstalls/monitoring/loki.yaml#L20), [dev Tempo](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/dev/apps/external/monitoring/tempo.yaml#L9), [common Tempo](https://github.com/layerswap/layerswap-fluxcd/blob/53b7e74183c84b7395ba1b28fd1a4efd1724dbf8/common/preinstalls/monitoring/tempo.yaml#L30). Loki deletion requires compactor retention configuration; setting a retention period alone is insufficient. [Loki retention documentation](https://grafana.com/docs/loki/latest/operations/storage/retention/).

Receiver defaults in current documentation include global rate limiting at 50 requests/s with burst 100, a 5MiB request cap, and automatic source-map downloads with wildcard origin permission. These are **documentation defaults, not verified deployed settings**, especially with unpinned chart constraints. Confirm the installed Alloy version and choose explicit budgets/origin restrictions before rollout. [Receiver configuration reference](https://grafana.com/docs/alloy/latest/reference/components/faro/faro.receiver/).

## Datasource correlation configuration — deferred correction

Provisioning contains references `datasourceUid: Tempo`, `datasourceUid: Loki`, and `datasourceUid: Prometheus`, but does not set matching explicit UIDs on those datasource definitions. The previously observed dev API UIDs are `P214B5B846CF3925F`, `P8E80F9AEF21F6940`, and `PBFA97CFB590B2093`, respectively. The declared names used as UIDs therefore do not match the observed dev datasource IDs.

Align references to stable, actual UIDs through a reviewed provisioning change when resuming correlation work. Do not simply rename/delete/recreate existing datasources, which could break dashboards. Tempo-to-logs tags target backend service/namespace/pod fields, not the verified frontend `session_id` path, so fixing UIDs alone does not establish frontend correlation. No datasource changes were made.

This is independent of the previous Tempo connection-refused failure. Repository presence cannot diagnose the running service or prove it recovered. The original request to skip Tempo remains in force.

## Next required evidence

The repository/access blocker is resolved. To verify **effective infrastructure state**, ask the infrastructure owner for sanitized exports of:

- Flux reconciliation status/revision and resolved Helm chart/image versions for monitoring releases;
- rendered active Alloy config and relevant Loki limits/compactor config;
- gateway/network policies and intended Grafana role mapping;
- actual retention/deletion status and approved sampling/volume policies.

Do not export Kubernetes Secret data or Grafana tokens. No new telemetry contract fields were upgraded to a stored verification state merely from these manifests. The Loki-only dashboard can continue separately while these operational checks remain open.
