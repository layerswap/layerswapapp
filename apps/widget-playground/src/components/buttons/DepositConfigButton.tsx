"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import clsx from "clsx";

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
                placeholder="Pay"
                onChange={(v) => updateDepositProp("buttonLabel", v)}
                disabled={!isButtonMode}
            />
            <ToggleRow
                label="Hide recipient"
                checked={depositProps.hideRecipient ?? false}
                onCheckedChange={(val) => updateDepositProp("hideRecipient", val)}
            />
        </div>
    );
}

export const DepositConfigButtonTrigger = () => (
    <div className="flex justify-between w-full">
        <label>Deposit settings</label>
    </div>
);
