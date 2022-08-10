import { RadioGroup } from "@headlessui/react";
import { FC } from "react";
import { classNames } from "./utils/classNames";

export interface NavRadioOption {
    value: string;
    displayName: string;
    isEnabled: boolean;
}

export interface NavRadioProps {
    label: string,
    value: string,
    items: NavRadioOption[],
    setSelected: (value: string) => void
}

const OptionToggle: FC<NavRadioProps> = ({ value, items, setSelected, label }) => {

    const onchange = (item: NavRadioOption) => {
        setSelected(item.value)
    }

    return (
        <RadioGroup value={items.find(i => i.value === value)} onChange={onchange} className="mt-2">
            <RadioGroup.Label className="font-normal text-pink-primary-300 text-sm">{label}</RadioGroup.Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 p-0.5 rounded-md bg-darkblue-600 border-ouline-blue border">
                {items.map((option) => (
                    <RadioGroup.Option
                        key={option.value}
                        value={option}
                        className={({ active, checked }) =>
                            classNames(
                                option.isEnabled ? 'cursor-pointer focus:outline-none' : 'opacity-25 cursor-not-allowed',
                                checked
                                    ? 'bg-darkblue-300 border-transparent text-white'
                                    : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200',
                                'border rounded-md py-2 px-3 flex items-center justify-center text-sm font-medium sm:flex-1'
                            )
                        }
                        disabled={!option.isEnabled}
                    >
                        <RadioGroup.Label as="div">
                            <div>
                                <p>
                                    {option.displayName}
                                </p>
                            </div>
                        </RadioGroup.Label>
                    </RadioGroup.Option>
                ))}
            </div>
        </RadioGroup>
    )
}
export default OptionToggle