"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SettingsCard } from "./SettingsCard";
import { useWidgetContext } from "@/context/ConfigContext";
import { PARAM_OPTIONS, FIELD_REQUIRES } from "./utils";
import type { InitialSettings } from "@layerswap/widget/types";

type CardItem = {
    id: string;
    prefillKey?: keyof InitialSettings;
};

// Field dependencies - child fields are automatically removed when parent is deleted
const FIELD_DEPENDENCIES: Record<string, (keyof InitialSettings)[]> = {
    from: ["fromAsset", "lockFrom", "lockFromAsset"],
    to: ["toAsset", "lockTo", "lockToAsset"],
    fromAsset: ["lockFromAsset"],
    toAsset: ["lockToAsset"],
};
export function InitialSettingsButton() {
    const { initialValues, updateInitialValues } = useWidgetContext();

    const hasSeeded = useRef(false);
    const [cards, setCards] = useState<CardItem[]>([]);
    // Seed cards from existing initialValues on mount
    useEffect(() => {
        if (hasSeeded.current) return;
        const existingKeys = (Object.keys(initialValues) as (keyof InitialSettings)[]).filter((key) => initialValues[key] !== undefined);
        if (existingKeys.length > 0) {
            setCards(existingKeys.map((key) => ({ id: crypto.randomUUID(), prefillKey: key })));
        }
        hasSeeded.current = true;
    }, [initialValues]);

    const cardKeyMap = useMemo(() => {
        const map: Record<string, keyof InitialSettings | undefined> = {};
        cards.forEach((card) => { map[card.id] = card.prefillKey; });
        return map;
    }, [cards]);

    const usedKeys = useMemo(() => Object.values(cardKeyMap).filter((key): key is keyof InitialSettings => key !== undefined),
        [cardKeyMap]
    );
    const handleCardKeyChange = useCallback((cardId: string, key?: keyof InitialSettings) => {
        setCards((prev) =>
            prev.map((card) => card.id === cardId ? { ...card, prefillKey: key } : card)
        );
    }, []);

    const handleParameterSelect = useCallback((value: string) => {
        const selectedKey = value as keyof InitialSettings;
        const newCard: CardItem = {
            id: crypto.randomUUID(),
            prefillKey: selectedKey
        };
        setCards((prev) => [...prev, newCard]);
    }, []);

    const handleRemoveCard = useCallback((cardId: string, key?: keyof InitialSettings) => {

        if (key) {
            updateInitialValues(key, undefined as any);
            const dependentFields = FIELD_DEPENDENCIES[key] || [];
            dependentFields.forEach((depKey) => {
                updateInitialValues(depKey, undefined as any);
            });
            if (dependentFields.length > 0) {
                setCards((prev) =>
                    prev.filter((card) => {
                        if (card.id === cardId) return false;
                        return !card.prefillKey || !dependentFields.includes(card.prefillKey);
                    })
                );
                return;
            }
        }
        setCards((prev) => prev.filter((card) => card.id !== cardId));
    }, [updateInitialValues]);

    const availableOptions = useMemo(() => {
        return PARAM_OPTIONS.filter((option) => {
            const requiredField = FIELD_REQUIRES[option.value];
            if (requiredField && !initialValues[requiredField])
                return false;
            if (usedKeys.includes(option.value as keyof InitialSettings))
                return false;

            return true;
        });
    }, [initialValues, usedKeys]);

    return (
        <div className="flex flex-col gap-4 px-2 pb-1">
            <Select onValueChange={handleParameterSelect}>
                <SelectTrigger hideChevron className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-secondary hover:bg-secondary-400 border-none transition-colors">
                    <Plus className="h-6 w-6" />
                    <span className="text-lg leading-6">Add Parameter</span>
                </SelectTrigger>
                <SelectContent className="w-full max-h-[500px] bg-secondary rounded-xl" position="popper" side="bottom" align="start" sideOffset={4}>
                    <SelectGroup>
                        {availableOptions.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                className="justify-center text-center hover:bg-secondary-400 p-2"
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            {cards.map((card) => (
                <SettingsCard
                    key={card.id}
                    cardId={card.id}
                    prefillKey={card.prefillKey}
                    usedKeys={usedKeys}
                    onParamKeyChange={handleCardKeyChange}
                    onRemove={handleRemoveCard}
                />
            ))}
        </div>
    );
}
export const InitialSettingsButtonTrigger = () => (
    <div className="flex justify-between w-full">
        <label>Initial settings</label>
    </div>
);
