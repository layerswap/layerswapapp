/** Optional, vendor-neutral analytics. No DOM text, input values or provider bodies. */
export type WidgetTelemetryEvent = {
    name: 'widget_flow' | 'widget_interaction' | 'widget_operation';
    attributes: Record<string, string | number | boolean | undefined>;
};

export type WidgetTelemetryHandler = (event: WidgetTelemetryEvent) => void;
