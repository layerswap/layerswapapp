---
'@layerswap/widget-js': patch
'@layerswap/widget-react': patch
---

Re-export the host callback event types from `@layerswap/widget-types`: `ErrorEventType`, `SwapStatusEvent`, `SwapLifecycleEvent`, `WidgetTelemetryEvent`, `WidgetTelemetryHandler`, `WidgetFlowStep`, `WidgetOperation` and `WidgetOperationOutcome`, so `callbacks` handlers can be typed without a direct dependency on `@layerswap/widget-types`.
