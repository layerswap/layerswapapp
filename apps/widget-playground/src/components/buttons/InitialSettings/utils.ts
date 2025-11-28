import { InitialSettings } from "@layerswap/widget/types";

type FieldType = "select" | "boolean" | "numeric" | "text";

export const PARAM_OPTIONS = [
    { value: "defaultTab", label: "Default tab", type: "select" as FieldType },
    { value: "from", label: "From network", type: "select" as FieldType },
    { value: "to", label: "To network", type: "select" as FieldType },
    { value: "fromAsset", label: "From asset", type: "select" as FieldType, requires: "from" as keyof InitialSettings },
    { value: "toAsset", label: "To asset", type: "select" as FieldType, requires: "to" as keyof InitialSettings },
    { value: "amount", label: "Amount", type: "numeric" as FieldType },
    { value: "destination_address", label: "Destination address", type: "text" as FieldType },
    { value: "lockFrom", label: "Lock from", type: "boolean" as FieldType, requires: "from" as keyof InitialSettings },
    { value: "lockTo", label: "Lock to", type: "boolean" as FieldType, requires: "to" as keyof InitialSettings },
    { value: "lockFromAsset", label: "Lock from asset", type: "boolean" as FieldType, requires: "fromAsset" as keyof InitialSettings },
    { value: "lockToAsset", label: "Lock to asset", type: "boolean" as FieldType, requires: "toAsset" as keyof InitialSettings },
    { value: "externalId", label: "External ID", type: "text" as FieldType },
    { value: "account", label: "Account", type: "text" as FieldType },
    { value: "actionButtonText", label: "Action button text", type: "text" as FieldType },
    { value: "appName", label: "App name", type: "text" as FieldType },
    { value: "depositMethod", label: "Deposit method", type: "text" as FieldType },
    { value: "clientId", label: "Client ID", type: "text" as FieldType },
    { value: "hideRefuel", label: "Hide refuel", type: "boolean" as FieldType }
];

export const FIELD_REQUIRES: Record<string, keyof InitialSettings> = PARAM_OPTIONS
    .filter((opt): opt is typeof PARAM_OPTIONS[number] & { requires: keyof InitialSettings } => 'requires' in opt)
    .reduce((acc, opt) => {
        acc[opt.value] = opt.requires;
        return acc;
    }, {} as Record<string, keyof InitialSettings>);

export const isSelectField = (key: keyof InitialSettings) =>
    PARAM_OPTIONS.find(opt => opt.value === key)?.type === "select";

export const isBooleanField = (key: keyof InitialSettings) =>
    PARAM_OPTIONS.find(opt => opt.value === key)?.type === "boolean";

export const isNumericField = (key: keyof InitialSettings) =>
    PARAM_OPTIONS.find(opt => opt.value === key)?.type === "numeric";