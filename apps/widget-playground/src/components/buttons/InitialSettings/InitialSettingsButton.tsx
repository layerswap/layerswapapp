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
    const [cardKeyMap, setCardKeyMap] = useState<Record<string, keyof InitialSettings | undefined>>({});

    // Seed cards from existing initialValues on mount
    useEffect(() => {
        if (hasSeeded.current) return;

        const existingKeys = (Object.keys(initialValues) as (keyof InitialSettings)[])
            .filter((key) => initialValues[key] !== undefined);

        if (existingKeys.length > 0) {
            setCards(existingKeys.map((key) => ({ id: crypto.randomUUID(), prefillKey: key })));
        }

        hasSeeded.current = true;
    }, [initialValues]);

    // Initialize cardKeyMap when cards change
    useEffect(() => {
        if (cards.length === 0) return;

        setCardKeyMap((prev) => {
            const updated = { ...prev };
            cards.forEach((card) => {
                if (updated[card.id] === undefined) {
                    updated[card.id] = card.prefillKey;
                }
            });
            return updated;
        });
    }, [cards]);

    // Get list of already-used keys to prevent duplicates
    const usedKeys = useMemo(
        () => Object.values(cardKeyMap).filter((key): key is keyof InitialSettings => key !== undefined),
        [cardKeyMap]
    );

    const handleCardKeyChange = useCallback((cardId: string, key?: keyof InitialSettings) => {
        setCardKeyMap((prev) => prev[cardId] === key ? prev : { ...prev, [cardId]: key });
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

            // Remove dependent cards if any exist
            if (dependentFields.length > 0) {
                const removeDependentState = (stateMap: Record<string, any>) => {
                    const updated = { ...stateMap };
                    Object.entries(cardKeyMap).forEach(([id, cardKey]) => {
                        if (cardKey && dependentFields.includes(cardKey)) {
                            delete updated[id];
                        }
                    });
                    delete updated[cardId];
                    return updated;
                };

                setCards((prev) =>
                    prev.filter((card) => {
                        if (card.id === cardId) return false;
                        const cardKey = cardKeyMap[card.id];
                        return !cardKey || !dependentFields.includes(cardKey);
                    })
                );
                setCardKeyMap(removeDependentState);
                return;
            }
        }

        // Remove card without dependencies
        setCards((prev) => prev.filter((card) => card.id !== cardId));
        setCardKeyMap(({ [cardId]: _, ...rest }) => rest);
    }, [cardKeyMap, updateInitialValues]);

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

            <Button
                type="button"
                variant="default"
                onClick={handleAddCard}
                className="gap-2 w-full p-3 rounded-xl"
            >
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
