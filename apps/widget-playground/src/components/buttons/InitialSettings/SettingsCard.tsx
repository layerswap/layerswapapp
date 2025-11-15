"use client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMemo, useEffect, useState } from "react";
import { useWidgetContext } from "@/context/ConfigContext";
import { useSettingsState } from "@/context/settings";
import type { InitialSettings } from "@layerswap/widget/types";
import IconDelete from "@/public/icons/Delete";
import { FIELD_REQUIRES, isBooleanField, isNumericField, isSelectField, PARAM_OPTIONS } from "./utils";

type SettingsCardProps = {
    cardId: string;
    prefillKey?: keyof InitialSettings;
    usedKeys?: ReadonlyArray<keyof InitialSettings>;
    onParamKeyChange?: (id: string, key?: keyof InitialSettings) => void;
    onRemove?: (id: string, key?: keyof InitialSettings) => void;
};

const resolveSelectItem = (item: any) => {
    const value = item.value ?? item.name ?? item.symbol;
    const label = item.label ?? item.display_name ?? item.symbol;
    const logo = item.logo;

    const content = logo ? (
        <div className="flex items-center space-x-1.5">
            <img src={logo} alt={label} className="rounded-sm w-5 h-5" />
            <p>{label}</p>
        </div>
    ) : (label);
    return { value, content };
};

const renderSelect = (items: any[], placeholder: string, disabled: boolean, currentValue: string | undefined, onValueChange: (value: string) => void) => (
    <Select value={currentValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full border-none bg-secondary-500 hover:bg-secondary-400 transition-colors h-12">
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto bg-secondary-500">
            <SelectGroup>
                {items.map((item, idx) => {
                    const { value, content } = resolveSelectItem(item);
                    return (<SelectItem key={idx} value={value}>
                        {content}
                    </SelectItem>);
                })}
            </SelectGroup>
        </SelectContent>
    </Select>
);

export function SettingsCard({ cardId, prefillKey, usedKeys = [], onParamKeyChange, onRemove, }: SettingsCardProps) {
    const { initialValues, updateInitialValues } = useWidgetContext();
    const { sourceExchanges, sourceRoutes, destinationRoutes } = useSettingsState();
    const selectedKey = prefillKey;
    const [textDraft, setTextDraft] = useState("");

    // Get the label for the current parameter
    const paramLabel = useMemo(() => {
        return PARAM_OPTIONS.find(opt => opt.value === selectedKey)?.label || "";
    }, [selectedKey]);

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

    const handleBooleanChange = (checked: boolean) => {
        if (selectedKey) updateInitialValues(selectedKey, checked as any);
    };
    const handleSelectChange = (value: string) => {
        if (selectedKey) updateInitialValues(selectedKey, value as any);
    };
    const handleRemove = () => {
        onRemove?.(cardId, selectedKey);
    };
    const select = (items: any[], placeholder: string, disabled = false) =>
        renderSelect(items, placeholder, disabled, currentValue as string | undefined, handleSelectChange)
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
            switch (selectedKey) {
                case "from":
                    return select(sourceRoutes, "Select from network");
                case "to":
                    return select(destinationRoutes, "Select to network");
                case "fromExchange":
                    return select(sourceExchanges, "Select exchange");
                case "fromAsset": {
                    const networkSelected = !!initialValues.from;
                    return select(fromTokens, networkSelected ? "Select asset" : "Pick a from network first", !networkSelected);
                }
                case "toAsset": {
                    const networkSelected = !!initialValues.to;
                    return select(toTokens, networkSelected ? "Select asset" : "Pick a to network first", !networkSelected);
                }
                case "defaultTab":
                    return select([{ value: "swap", label: "Swap" }, { value: "cex", label: "CEX" }], "Select default tab");
            }
        }
        if (isBooleanField(selectedKey)) {
            return (
                <div className="w-full h-12 rounded-xl bg-secondary-500 px-4 flex items-center justify-end">
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
                    className="bg-secondary-500 rounded-xl h-12"
                />
            );
        }
        return (
            <Input
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder={String(selectedKey)}
                className="bg-secondary-500 rounded-xl h-12"
            />
        );
    };
    if (!selectedKey) return null;

    return (
        <div className="flex w-full gap-2">
            <div className="flex-1 flex flex-col">
                <label className="text-sm text-secondary-text mb-1 block">{paramLabel}</label>
                <div className="flex-1">
                    {renderValueEditor()}
                </div>
            </div>
            <div className="flex flex-col justify-end">
                <div
                    onClick={handleRemove}
                    className="shrink-0 w-11 h-11 rounded-xl bg-secondary-700 hover:bg-secondary-600 cursor-pointer flex items-center justify-center transition-colors"
                    title="Remove"
                >
                    <IconDelete className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
