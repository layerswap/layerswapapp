"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useRef, useState } from "react";
import { useWidgetContext } from "@/context/ConfigContext";
import { useSettingsState } from "@/context/settings";
import type { InitialSettings } from "@layerswap/widget/types";
import { Trash } from "lucide-react";

// Field type classifications
const SELECT_FIELDS = ["from", "to", "fromExchange", "fromAsset", "toAsset", "defaultTab"] as const satisfies readonly (keyof InitialSettings)[];
const BOOLEAN_FIELDS = ["lockFrom", "lockTo", "lockFromAsset", "lockToAsset", "hideRefuel", "hideAddress", "hideFrom", "hideTo", "hideDepositMethod", "hideLogo", "lockNetwork", "lockExchange"] as const;
const NUMERIC_FIELDS = ["amount"] as const;

// Type guards
const isSelectField = (key: keyof InitialSettings): key is (typeof SELECT_FIELDS)[number] =>
    (SELECT_FIELDS as readonly string[]).includes(key as string);
const isBooleanField = (key: keyof InitialSettings): key is (typeof BOOLEAN_FIELDS)[number] =>
    (BOOLEAN_FIELDS as readonly string[]).includes(key as string);
const isNumericField = (key: keyof InitialSettings): key is (typeof NUMERIC_FIELDS)[number] =>
    (NUMERIC_FIELDS as readonly string[]).includes(key as string);

// Available parameter options with labels
const PARAM_OPTIONS = [
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

type SettingsCardProps = {
    cardId: string;
    prefillKey?: keyof InitialSettings;
    usedKeys?: ReadonlyArray<keyof InitialSettings>;
    onParamKeyChange?: (id: string, key?: keyof InitialSettings) => void;
    onRemove?: (id: string, key?: keyof InitialSettings) => void;
};

export function SettingsCard({
    cardId,
    prefillKey,
    usedKeys = [],
    onParamKeyChange,
    onRemove,
}: SettingsCardProps) {
    const { initialValues, updateInitialValues } = useWidgetContext();
    const { sourceExchanges, sourceRoutes, destinationRoutes } = useSettingsState();

    const [selectedKey, setSelectedKey] = useState<keyof InitialSettings | undefined>(prefillKey);
    const [textDraft, setTextDraft] = useState("");
    const lastFilledRef = useRef(false);

    // Notify parent when prefillKey is set
    useEffect(() => {
        if (prefillKey) {
            onParamKeyChange?.(cardId, prefillKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentValue = useMemo(
        () => (selectedKey ? initialValues[selectedKey] : undefined),
        [selectedKey, initialValues]
    );

    // Filter available options based on dependencies and usage
    const availableOptions = useMemo(() => {
        const hasFrom = !!initialValues.from;
        const hasTo = !!initialValues.to;
        const hasFromAsset = !!initialValues.fromAsset;
        const hasToAsset = !!initialValues.toAsset;

        return PARAM_OPTIONS.filter((option) => {
            // Check dependencies
            if (option.value === "lockFrom" && !hasFrom) return false;
            if (option.value === "fromAsset" && !hasFrom) return false;
            if (option.value === "lockFromAsset" && !hasFromAsset) return false;
            if (option.value === "lockTo" && !hasTo) return false;
            if (option.value === "toAsset" && !hasTo) return false;
            if (option.value === "lockToAsset" && !hasToAsset) return false;

            // Check if already used by another card
            if (usedKeys.includes(option.value) && option.value !== selectedKey) return false;

            return true;
        });
    }, [initialValues, usedKeys, selectedKey]);

    // Get tokens for from/to networks
    const fromTokens = useMemo(() => {
        if (!initialValues.from) return [];
        const network = sourceRoutes.find((n) => n.name === initialValues.from);
        return network?.tokens ?? [];
    }, [initialValues.from, sourceRoutes]);

    const toTokens = useMemo(() => {
        if (!initialValues.to) return [];
        const network = destinationRoutes.find((n) => n.name === initialValues.to);
        return network?.tokens ?? [];
    }, [initialValues.to, destinationRoutes]);

    // Sync text draft with current value for text/numeric fields
    useEffect(() => {
        if (!selectedKey || isBooleanField(selectedKey) || isSelectField(selectedKey)) {
            setTextDraft("");
            return;
        }
        setTextDraft((currentValue as string | undefined) ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey, currentValue]);

    // Debounced update for text/numeric fields
    useEffect(() => {
        if (!selectedKey || isBooleanField(selectedKey) || isSelectField(selectedKey)) return;

        const timeoutId = setTimeout(() => {
            if (textDraft.trim() === "") {
                updateInitialValues(selectedKey, undefined as any);
            } else if (isNumericField(selectedKey)) {
                const sanitized = textDraft.replace(/[^\d.]/g, "").replace(/^(\d*\.\d*).*$/, "$1");
                updateInitialValues(selectedKey, sanitized as any);
            } else {
                updateInitialValues(selectedKey, textDraft as any);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textDraft, selectedKey]);

    // Track filled status (currently unused but kept for potential future use)
    useEffect(() => {
        if (!selectedKey) {
            if (lastFilledRef.current) {
                lastFilledRef.current = false;
            }
            return;
        }

        const isFilled = isBooleanField(selectedKey)
            ? typeof currentValue === "boolean"
            : currentValue !== undefined && String(currentValue).length > 0;

        lastFilledRef.current = isFilled;
    }, [selectedKey, currentValue]);

    // Handlers
    const handleKeyChange = (key: string) => {
        const newKey = key as keyof InitialSettings;
        setSelectedKey(newKey);
        onParamKeyChange?.(cardId, newKey);
    };

    const handleBooleanChange = (checked: boolean) => {
        if (selectedKey) {
            updateInitialValues(selectedKey, checked as any);
        }
    };

    const handleSelectChange = (value: string) => {
        if (selectedKey) {
            updateInitialValues(selectedKey, value as any);
        }
    };

    const handleRemove = () => {
        onRemove?.(cardId, selectedKey);
    };

    // Render the appropriate input based on field type
    const renderValueEditor = () => {
        if (!selectedKey) {
            return (
                <div className="w-full rounded-xl bg-secondary-600/60 px-3 text-left text-secondary-text h-full flex items-center">
                    <p>Pick a parameter first</p>
                </div>
            );
        }

        // Select fields
        if (isSelectField(selectedKey)) {
            // Network select (from/to)
            if (selectedKey === "from" || selectedKey === "to") {
                const routes = selectedKey === "from" ? sourceRoutes : destinationRoutes;
                const placeholder = selectedKey === "from" ? "Select from network" : "Select to network";

                return (
                    <Select value={(currentValue as string | undefined) ?? undefined} onValueChange={handleSelectChange}>
                        <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectGroup>
                                {routes.map(({ display_name, logo, name }, idx) => (
                                    <SelectItem key={idx} value={name as string}>
                                        <div className="flex items-center space-x-1.5">
                                            <img src={logo} alt={display_name} className="rounded-sm w-5 h-5" />
                                            <p>{display_name}</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                );
            }

            // Exchange select
            if (selectedKey === "fromExchange") {
                return (
                    <Select value={(currentValue as string | undefined) ?? undefined} onValueChange={handleSelectChange}>
                        <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                            <SelectValue placeholder="Select exchange" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectGroup>
                                {sourceExchanges.map(({ display_name, logo, name }, idx) => (
                                    <SelectItem key={idx} value={name as string}>
                                        <div className="flex items-center space-x-1.5">
                                            <img src={logo} alt={display_name} className="rounded-sm w-5 h-5" />
                                            <p>{display_name}</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                );
            }

            // Asset select (fromAsset/toAsset)
            if (selectedKey === "fromAsset" || selectedKey === "toAsset") {
                const isFromAsset = selectedKey === "fromAsset";
                const tokens = isFromAsset ? fromTokens : toTokens;
                const networkSelected = isFromAsset ? !!initialValues.from : !!initialValues.to;
                const networkType = isFromAsset ? "from" : "to";

                return (
                    <Select
                        value={(currentValue as string | undefined) ?? undefined}
                        onValueChange={handleSelectChange}
                        disabled={!networkSelected}
                    >
                        <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                            <SelectValue placeholder={networkSelected ? "Select asset" : `Pick a ${networkType} network first`} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectGroup>
                                {tokens.map((token, idx) => (
                                    <SelectItem key={idx} value={token.symbol}>
                                        <div className="flex items-center space-x-1.5">
                                            <img src={token.logo} alt={token.symbol} className="rounded-sm w-5 h-5" />
                                            <p>{token.symbol}</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                );
            }

            // Default tab select
            if (selectedKey === "defaultTab") {
                return (
                    <Select value={(currentValue as string | undefined) ?? undefined} onValueChange={handleSelectChange}>
                        <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                            <SelectValue placeholder="Select default tab" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="swap">Swap</SelectItem>
                                <SelectItem value="cex">CEX</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                );
            }
        }

        // Boolean fields
        if (isBooleanField(selectedKey)) {
            return (
                <div className="w-full h-full rounded-xl bg-secondary-500 px-4 flex items-center justify-end">
                    <Switch checked={!!currentValue} onCheckedChange={handleBooleanChange} />
                </div>
            );
        }

        // Numeric fields
        if (isNumericField(selectedKey)) {
            return (
                <Input
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="0.0"
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    className="bg-secondary-500 h-full rounded-xl"
                />
            );
        }

        // Text fields
        return (
            <Input
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder={String(selectedKey)}
                className="bg-secondary-500 h-full rounded-xl"
            />
        );
    };

    return (
        <div className="flex w-full items-stretch gap-2">
            {/* Parameter selector */}
            <div className="w-1/2">
                <Select value={selectedKey as string | undefined} onValueChange={handleKeyChange}>
                    <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors">
                        <SelectValue placeholder="Pick a parameter" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                        <SelectGroup>
                            {availableOptions.map((option) => (
                                <SelectItem key={option.value as string} value={option.value as string}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            {/* Value editor and delete button */}
            <div className="flex-1 flex items-stretch gap-2">
                <div className="flex-1 truncate">{renderValueEditor()}</div>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemove}
                    title="Remove"
                    className="self-center shrink-0 w-10 aspect-square rounded-full bg-red-500/15 hover:bg-red-500/25"
                >
                    <Trash className="h-4 w-4 text-red-500" />
                </Button>
            </div>
        </div>
    );
}
