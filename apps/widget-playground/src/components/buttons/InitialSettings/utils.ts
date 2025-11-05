import { InitialSettings } from "@layerswap/widget/types";

// Field type classifications
export const SELECT_FIELDS = ["from", "to", "fromExchange", "fromAsset", "toAsset", "defaultTab"] as const;
export const BOOLEAN_FIELDS = ["lockFrom", "lockTo", "lockFromAsset", "lockToAsset", "hideRefuel", "hideAddress", "hideFrom", "hideTo", "hideDepositMethod", "hideLogo", "lockNetwork", "lockExchange"] as const;
const NUMERIC_FIELDS = ["amount"] as const;
// Field dependencies - what each field requires to be set before it can be used
export const FIELD_REQUIRES: Record<string, keyof InitialSettings> = {
    fromAsset: "from",
    lockFrom: "from",
    lockFromAsset: "fromAsset",
    toAsset: "to",
    lockTo: "to",
    lockToAsset: "toAsset",
};
// Type guards
export const isSelectField = (key: keyof InitialSettings): key is (typeof SELECT_FIELDS)[number] => (SELECT_FIELDS as readonly string[]).includes(key as string);
export const isBooleanField = (key: keyof InitialSettings): key is (typeof BOOLEAN_FIELDS)[number] => (BOOLEAN_FIELDS as readonly string[]).includes(key as string);
export const isNumericField = (key: keyof InitialSettings): key is (typeof NUMERIC_FIELDS)[number] => (NUMERIC_FIELDS as readonly string[]).includes(key as string);
// Available parameter options with labels
export const PARAM_OPTIONS = [
    { value: "from", label: "From (network)" },
    { value: "to", label: "To (network)" },
    { value: "fromExchange", label: "From exchange" },
    { value: "fromAsset", label: "From asset" },
    { value: "toAsset", label: "To asset" },
    { value: "lockFrom", label: "Lock from" },
    { value: "lockTo", label: "Lock to" },
    { value: "lockFromAsset", label: "Lock from asset" },
    { value: "lockToAsset", label: "Lock to asset" },
    { value: "hideRefuel", label: "Hide refuel" },
    { value: "hideAddress", label: "Hide address" },
    { value: "hideFrom", label: "Hide from" },
    { value: "hideTo", label: "Hide to" },
    { value: "hideDepositMethod", label: "Hide deposit method" },
    { value: "hideLogo", label: "Hide logo" },
    { value: "lockNetwork", label: "Lock network" },
    { value: "lockExchange", label: "Lock exchange" },
    { value: "amount", label: "Amount" },
    { value: "destination_address", label: "Destination address" },
    { value: "externalId", label: "External ID" },
    { value: "account", label: "Account" },
    { value: "actionButtonText", label: "Action button text" },
    { value: "theme", label: "Theme" },
    { value: "appName", label: "App name" },
    { value: "depositMethod", label: "Deposit method" },
    { value: "clientId", label: "Client ID" },
    { value: "defaultTab", label: "Default tab" },
    { value: "coinbase_redirect", label: "Coinbase redirect" },
] as const;