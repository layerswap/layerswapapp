"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./SettingsCard";
import { useWidgetContext } from "@/context/ConfigContext";
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
    const [cards, setCards] = useState<CardItem[]>([{ id: crypto.randomUUID() }]);
    // Seed cards from existing initialValues on mount
    useEffect(() => {
        if (hasSeeded.current) return;
        const existingKeys = (Object.keys(initialValues) as (keyof InitialSettings)[]).filter((key) => initialValues[key] !== undefined);
        if (existingKeys.length > 0) {
            setCards(existingKeys.map((key) => ({ id: crypto.randomUUID(), prefillKey: key })));
        }
        hasSeeded.current = true;
    }, [initialValues]);
    // Derive cardKeyMap from cards - maps card IDs to their selected keys
    const cardKeyMap = useMemo(() => {
        const map: Record<string, keyof InitialSettings | undefined> = {};
        cards.forEach((card) => { map[card.id] = card.prefillKey; });
        return map;
    }, [cards]);
    // Get list of already-used keys to prevent duplicates
    const usedKeys = useMemo(() => Object.values(cardKeyMap).filter((key): key is keyof InitialSettings => key !== undefined),
        [cardKeyMap]
    );
    const handleCardKeyChange = useCallback((cardId: string, key?: keyof InitialSettings) => {
        setCards((prev) =>
            prev.map((card) => card.id === cardId ? { ...card, prefillKey: key } : card)
        );
    }, []);

    const handleAddCard = useCallback(() => {
        setCards((prev) => [...prev, { id: crypto.randomUUID() }]);
    }, []);

    const handleRemoveCard = useCallback((cardId: string, key?: keyof InitialSettings) => {
        // Clear the field value from context
        if (key) {
            updateInitialValues(key, undefined as any);
            // Get dependent fields to cascade delete
            const dependentFields = FIELD_DEPENDENCIES[key] || [];
            // Clear all dependent field values
            dependentFields.forEach((depKey) => {
                updateInitialValues(depKey, undefined as any);
            });
            // Remove card and any cards with dependent fields
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
        // Remove card without dependencies
        setCards((prev) => prev.filter((card) => card.id !== cardId));
    }, [updateInitialValues]);

    return (
        <div className="flex flex-col gap-4">
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
            <Button type="button" variant="default" onClick={handleAddCard} className="gap-2 w-full p-3 rounded-xl">
                <Plus className="h-6 w-6" />
                Add
            </Button>
        </div>
    );
}
export const InitialSettingsButtonTrigger = () => (
    <div className="flex justify-between w-full">
        <label>Initial settings</label>
    </div>
);
