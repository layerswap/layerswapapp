import type { SwapLifecycleOutcome, SwapLifecycleStep } from './logEvents';

/** Additional attributes must remain primitive; no DOM text or provider bodies. */
export type WidgetTelemetryAttributes = Record<string, string | number | boolean | undefined>;

export type WidgetOperation =
    | 'quote_request' | 'detailed_quote_request' | 'limits_request' | 'swap_creation'
    | 'deposit_actions' | 'balance_fetch' | 'gas_estimation' | 'wallet_connection'
    | 'wallet_transfer' | 'gasless_authorization';

export type WidgetOperationOutcome = 'succeeded' | 'failed' | 'cancelled' | 'rejected' | 'partial' | 'unavailable';
export type WidgetFlowStep = SwapLifecycleStep | 'form_viewed' | 'form_started' | 'validation_shown';

/** Event-specific fields are part of the public contract, independent of any sink. */
export type WidgetTelemetryData = {
    widget_flow: WidgetTelemetryAttributes & {
        step: WidgetFlowStep;
        outcome?: SwapLifecycleOutcome;
        reason_code?: string;
    };
    widget_interaction: WidgetTelemetryAttributes & {
        action: string;
        trigger: string;
    };
    widget_operation: WidgetTelemetryAttributes & {
        operation: WidgetOperation;
        operation_id: string;
        outcome: WidgetOperationOutcome;
        duration_ms: number;
    };
};

/** Optional, vendor-neutral analytics with a discriminated, versioned payload. */
export type WidgetTelemetryEvent = {
    [Name in keyof WidgetTelemetryData]: {
        name: Name;
        attributes: WidgetTelemetryData[Name] & { schema_version: 1; event_id: string };
    }
}[keyof WidgetTelemetryData];

export type WidgetTelemetryHandler = (event: WidgetTelemetryEvent) => void;
