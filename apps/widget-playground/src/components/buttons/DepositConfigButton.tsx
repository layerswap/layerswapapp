"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multiselect";
import { DEPOSIT_METHODS, type DepositMethodId } from "@layerswap/widget";
import clsx from "clsx";

// Friendly labels for the deposit-method allow-list control. Keyed by
// DepositMethodId so adding a method to the widget surfaces a type error here
// until it's given a label.
const METHOD_LABELS: Record<DepositMethodId, string> = {
    wallet: "Wallet transfer",
    deposit_address: "Deposit address",
    hyperliquid: "Hyperliquid",
    polymarket: "Polymarket",
};
const METHOD_OPTIONS = DEPOSIT_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }));

const ToggleRow = ({ label, checked, onCheckedChange }: { label: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
    <div className="rounded-md py-3 px-2 flex items-center justify-between gap-2 hover:bg-secondary-500 transition-colors duration-200">
        <span className="text-xl leading-6 text-primary-text">{label}</span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
);

const TextRow = ({ label, value, onChange, placeholder, disabled }: { label: string, value: string | undefined, onChange: (v: string) => void, placeholder?: string, disabled?: boolean }) => (
    <div className="flex flex-col gap-1 px-2 py-2">
        <label className={clsx("text-sm text-secondary-text", disabled && "opacity-50")}>{label}</label>
        <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-secondary-500 rounded-xl h-11"
        />
    </div>
);

const NumberRow = ({ label, value, onChange, placeholder, disabled }: { label: string, value: number | undefined, onChange: (v: number | undefined) => void, placeholder?: string, disabled?: boolean }) => (
    <div className="flex flex-col gap-1 px-2 py-2">
        <label className={clsx("text-sm text-secondary-text", disabled && "opacity-50")}>{label}</label>
        <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={value ?? ""}
            onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return onChange(undefined);
                const parsed = Number(raw);
                onChange(Number.isFinite(parsed) ? parsed : undefined);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-secondary-500 rounded-xl h-11"
        />
    </div>
);

export function DepositConfigButton() {
    const { depositProps, updateDepositProp } = useWidgetContext();
    const isButtonMode = depositProps.mode === "button";

    return (
        <div className="flex flex-col gap-2 pb-1">
            <TextRow
                label="Title"
                value={depositProps.title}
                placeholder="Deposit"
                onChange={(v) => updateDepositProp("title", v)}
            />
            <TextRow
                label="Action button text"
                value={depositProps.actionButtonText}
                placeholder="Deposit"
                onChange={(v) => updateDepositProp("actionButtonText", v)}
            />
            <TextRow
                label="Trigger button label"
                value={depositProps.buttonLabel}
                placeholder="Deposit"
                onChange={(v) => updateDepositProp("buttonLabel", v)}
                disabled={!isButtonMode}
            />
            <NumberRow
                label="Default amount (USD)"
                value={depositProps.defaultAmountUsd}
                placeholder="1"
                onChange={(v) => updateDepositProp("defaultAmountUsd", v)}
            />
            <ToggleRow
                label="Show destination address"
                checked={depositProps.showDestinationAddress ?? false}
                onCheckedChange={(val) => updateDepositProp("showDestinationAddress", val)}
            />
            <div className="flex flex-col gap-1 px-2 py-2">
                <label className="text-sm text-secondary-text">Methods</label>
                {/* Allow-list of funding methods to show. Undefined means "all", so
                    default the control to every method until the user narrows it. */}
                <MultiSelect
                    options={METHOD_OPTIONS}
                    value={depositProps.methods ?? [...DEPOSIT_METHODS]}
                    onChange={(val) => updateDepositProp("methods", val as DepositMethodId[])}
                    placeholder="Select methods"
                />
            </div>
        </div>
    );
}

export const DepositConfigButtonTrigger = () => (
    <div className="flex justify-between w-full">
        <label>Deposit settings</label>
    </div>
);
