import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Option = {
    value: string
    label: string
}

interface CustomRadioGroupProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
}

export function CustomRadioGroup({ options, value, onChange }: CustomRadioGroupProps) {
    return (
        <div className="space-y-1">
            {options.map((option) => {
                const isChecked = value === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        type="button"
                        className={cn(
                            "relative flex w-full cursor-pointer items-center justify-between rounded-md border p-3 text-base transition-colors",
                            "bg-secondary-700 text-secondary-text border-secondary-500",
                            isChecked && "bg-secondary-700 text-primary-text border-primary"
                        )}
                    >
                        <span>{option.label}</span>
                        {isChecked && <CheckIcon className="h-4 w-4 text-primary" />}
                    </button>
                )
            })}
        </div>
    )
}
