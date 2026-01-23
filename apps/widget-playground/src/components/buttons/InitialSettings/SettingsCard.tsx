"use client";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useMemo, useEffect, useState } from "react";
import { useWidgetContext } from "@/context/ConfigContext";
import { useSettingsState } from "@/context/settings";
import type { InitialSettings } from "@layerswap/widget/types";
import IconDelete from "@/public/icons/Delete";
import IconSwap from "@/public/icons/Swap";
import IconCEX from "@/public/icons/CEX";
import { isBooleanField, isNumericField, isSelectField, PARAM_OPTIONS } from "./utils";

type SettingsCardProps = {
    cardId: string;
    prefillKey?: keyof InitialSettings;
    usedKeys?: ReadonlyArray<keyof InitialSettings>;
    onParamKeyChange?: (id: string, key?: keyof InitialSettings) => void;
    onRemove?: (id: string, key?: keyof InitialSettings) => void;
};

const resolveSelectItem = (item: any) => {
    if (typeof item === "string") {
        return { value: item, content: item.charAt(0).toUpperCase() + item.slice(1) };
    }

    const value = item.value ?? item.name ?? item.symbol;
    const label = item.label ?? item.display_name ?? item.symbol;
    const logo = item.logo;
    const icon = item.icon;

    if (icon) {
        const IconComponent = icon;
        const content = (
            <div className="flex items-center gap-2">
                <IconComponent className="w-5 h-5" />
                <p className="text-primary-text">{label}</p>
            </div>
        );
        return { value, content, icon: IconComponent };
    }

    const content = logo ? (
        <div className="flex items-center space-x-1.5">
            <img src={logo} alt={label} className="rounded-sm w-5 h-5" />
            <p>{label}</p>
        </div>
    ) : (label);
    return { value, content };
};

const renderSelect = (items: any[], placeholder: string, disabled: boolean, currentValue: string | undefined, onValueChange: (value: string) => void) => {
    const getSelectedContent = () => {
        if (!currentValue) return <SelectValue placeholder={placeholder} />;

        const selectedItem = items.find(item => {
            const itemValue = typeof item === "string" ? item : (item.value ?? item.name ?? item.symbol);
            return itemValue === currentValue;
        });

        return selectedItem ? resolveSelectItem(selectedItem).content : <SelectValue placeholder={placeholder} />;
    };

    return (
        <Select value={currentValue} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className="w-full border-none bg-secondary-500 hover:bg-secondary-400 transition-colors h-12">
                {getSelectedContent()}
            </SelectTrigger>
            <SelectContent className="max-h-[420px] overflow-y-auto bg-secondary-500">
                <SelectGroup>
                    {items.map((item, idx) => {
                        const { value, content } = resolveSelectItem(item);
                        return (
                            <SelectItem key={idx} value={value}>
                                {content}
                            </SelectItem>
                        );
                    })}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};

export function SettingsCard({ cardId, prefillKey, usedKeys = [], onParamKeyChange, onRemove, }: SettingsCardProps) {
    const { initialValues, updateInitialValues } = useWidgetContext();
    const { sourceExchanges, sourceRoutes, destinationRoutes } = useSettingsState();
    const selectedKey = prefillKey;
    const [textDraft, setTextDraft] = useState("");

    const paramLabel = useMemo(() => {
        return PARAM_OPTIONS.find(opt => opt.value === selectedKey)?.label || "";
    }, [selectedKey]);

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

    useEffect(() => {
        if (!selectedKey || isBooleanField(selectedKey) || isSelectField(selectedKey)) {
            setTextDraft("");
            return;
        }
        setTextDraft((currentValue as string | undefined) ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey, currentValue]);

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

    const handleSelectChange = (value: string) => {
        if (selectedKey) {
            if (isBooleanField(selectedKey)) {
                updateInitialValues(selectedKey, value === "on");
            } else {
                updateInitialValues(selectedKey, value);
            }
        }
    };
    const handleRemove = () => {
        onRemove?.(cardId, selectedKey);
    };
    const select = (items: any[], placeholder: string, disabled = false) => {
        let displayValue: string | undefined;

        if (isBooleanField(selectedKey)) {
            displayValue = currentValue === true ? "on" : "off";
            if (currentValue === undefined && selectedKey) {
                updateInitialValues(selectedKey, false);
            }
        } else if (selectedKey === "defaultTab") {
            displayValue = (currentValue as string) || "swap";
            if (!currentValue && selectedKey) {
                updateInitialValues(selectedKey, "swap");
            }
        } else {
            displayValue = currentValue as string | undefined;
        }

        return renderSelect(items, placeholder, disabled, displayValue, handleSelectChange);
    }
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
                    return select([
                        { value: "swap", label: "Swap", icon: IconSwap },
                        { value: "cex", label: "CEX", icon: IconCEX }
                    ], "Select default tab");
            }
        }
        if (isBooleanField(selectedKey)) {
            return select(["on", "off"], "Select option");
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
