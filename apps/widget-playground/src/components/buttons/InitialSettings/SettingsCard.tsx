"use client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState } from "react";
import { useWidgetContext } from "@/context/ConfigContext";
import { useSettingsState } from "@/context/settings";
import type { InitialSettings } from "@layerswap/widget/types";
import { Trash } from "lucide-react";
import { FIELD_REQUIRES, isBooleanField, isNumericField, isSelectField, PARAM_OPTIONS } from "./utils";

type SettingsCardProps = {
    cardId: string;
    prefillKey?: keyof InitialSettings;
    usedKeys?: ReadonlyArray<keyof InitialSettings>;
    onParamKeyChange?: (id: string, key?: keyof InitialSettings) => void;
    onRemove?: (id: string, key?: keyof InitialSettings) => void;
};

export function SettingsCard({ cardId, prefillKey, usedKeys = [], onParamKeyChange, onRemove, }: SettingsCardProps) {
    const { initialValues, updateInitialValues } = useWidgetContext();
    const { sourceExchanges, sourceRoutes, destinationRoutes } = useSettingsState();
    const [selectedKey, setSelectedKey] = useState<keyof InitialSettings | undefined>(prefillKey);
    const [textDraft, setTextDraft] = useState("");
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
        return PARAM_OPTIONS.filter((option) => {
            // Check if this field has a dependency that isn't met
            const requiredField = FIELD_REQUIRES[option.value];
            if (requiredField && !initialValues[requiredField])
                return false;
            // Check if already used by another card
            if (usedKeys.includes(option.value) && option.value !== selectedKey)
                return false;

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

    const handleKeyChange = (key: string) => {
        const newKey = key as keyof InitialSettings;
        setSelectedKey(newKey);
        onParamKeyChange?.(cardId, newKey);
    };

    const handleBooleanChange = (checked: boolean) => {
        if (selectedKey) updateInitialValues(selectedKey, checked as any);
    };
    const handleSelectChange = (value: string) => {
        if (selectedKey) updateInitialValues(selectedKey, value as any);
    };
    const handleRemove = () => {
        onRemove?.(cardId, selectedKey);
    };

    const renderRouteSelect = (items: Array<{ display_name: string; logo: string; name: string }>, placeholder: string, disabled = false) => (
        <Select value={(currentValue as string | undefined) ?? undefined} onValueChange={handleSelectChange} disabled={disabled}        >
            <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectGroup>
                    {items.map(({ display_name, logo, name }, idx) => (
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

    const renderTokenSelect = (tokens: Array<{ symbol: string; logo: string }>, placeholder: string, disabled = false) => (
        <Select value={(currentValue as string | undefined) ?? undefined} onValueChange={handleSelectChange} disabled={disabled}        >
            <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                <SelectValue placeholder={placeholder} />
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

    const renderSimpleSelect = (options: Array<{ value: string; label: string }>, placeholder: string) => (
        <Select value={(currentValue as string | undefined) ?? undefined} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors h-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );

    // Render the appropriate input based on field type
    const renderValueEditor = () => {
        if (!selectedKey) {
            return (
                <div className="w-full rounded-xl bg-secondary-600/60 px-3 text-left text-secondary-text h-full flex items-center">
                    <p>Pick a parameter first</p>
                </div>
            );
        }
        if (isSelectField(selectedKey)) {
            if (selectedKey === "from") {
                return renderRouteSelect(sourceRoutes, "Select from network");
            }
            if (selectedKey === "to") {
                return renderRouteSelect(destinationRoutes, "Select to network");
            }
            if (selectedKey === "fromExchange") {
                return renderRouteSelect(sourceExchanges, "Select exchange");
            }
            if (selectedKey === "fromAsset") {
                const networkSelected = !!initialValues.from;
                return renderTokenSelect(fromTokens, networkSelected ? "Select asset" : "Pick a from network first", !networkSelected);
            }
            if (selectedKey === "toAsset") {
                const networkSelected = !!initialValues.to;
                return renderTokenSelect(toTokens, networkSelected ? "Select asset" : "Pick a to network first", !networkSelected);
            }
            // Default tab select
            if (selectedKey === "defaultTab") {
                return renderSimpleSelect([{ value: "swap", label: "Swap" }, { value: "cex", label: "CEX" },], "Select default tab");
            }
        }
        if (isBooleanField(selectedKey)) {
            return (
                <div className="w-full h-full rounded-xl bg-secondary-500 px-4 flex items-center justify-end">
                    <Switch checked={!!currentValue} onCheckedChange={handleBooleanChange} />
                </div>
            );
        }
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
