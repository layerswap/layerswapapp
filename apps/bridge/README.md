
<br />
<div align="left">
  <h1 align="left">UI for Layerswap web application</h1>
</div>
 
This repository contains implementation of Layerswap UI



### Run locally


  ```sh
  pnpm install
  pnpm dev
  ```

 
### Required environment variables

  ```yaml
  NEXT_PUBLIC_LS_API = https://api-dev.layerswap.cloud/
  NEXT_PUBLIC_API_KEY = mainnet #sandbox for testnets
  ```

### Faro browser observability

Set the collector URL and restart/rebuild the app to enable browser telemetry.

```yaml
NEXT_PUBLIC_FARO_COLLECTOR_URL: https://your-faro-collector.example/collect
NEXT_PUBLIC_FARO_SAMPLE_RATE: 1 # optional; defaults to all sessions
```

See the [Grafana guide](grafana/README.md) for configuration, dashboards,
tracing and source maps, and the [telemetry contract](grafana/faro-telemetry-contract.md)
for event fields and behavior.
