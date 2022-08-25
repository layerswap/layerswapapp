import { RadioGroup } from "@headlessui/react";
import { ArrowRightIcon } from "@heroicons/react/solid";
import { FC } from "react";
import { classNames } from "./utils/classNames";

export interface NavRadioOption {
    value: string;
    isEnabled: boolean;
    isHighlighted: boolean;
}

export interface NavRadioProps {
    label: string,
    value: string,
    items: NavRadioOption[],
    setSelected: (value: string) => void,
    disabled?: boolean
}

const OptionToggle: FC<NavRadioProps> = ({ value, items, setSelected, label, disabled }) => {

    const onchange = (item: NavRadioOption) => {
        setSelected(item.value)
    }

    return (
        <RadioGroup value={items.find(i => i.value === value)} disabled={disabled} onChange={onchange} className="mt-2 w-full">
            <RadioGroup.Label className="font-normal text-pink-primary-300 text-sm">{label}</RadioGroup.Label>
            <div className="grid grid-cols-2 gap-1 md:gap-2 p-0.5 md:p-2 rounded-md bg-darkblue-600 border-ouline-blue border">
                {items.map((option) => (
                    <RadioGroup.Option
                        key={option.value}
                        value={option}
                        className={({ checked }) =>
                            classNames(
                                option.isEnabled ? 'cursor-pointer focus:outline-none' : 'opacity-25 cursor-not-allowed',
                                checked
                                    ? 'bg-darkblue-300 border-transparent text-white'
                                    : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200',
                                'border rounded-md p-1 flex items-center justify-center text-sm font-medium sm:flex-1'
                            )
                        }
                        disabled={!option.isEnabled}>
                        <div>
                            {
                                option.value === 'onramp' ?
                                    <div className="flex items-center space-x-0.5 md:space-x-2 md:p-0 p-1.5 text-sm md:text-base">
                                        <span>
                                            Exchange
                                        </span>
                                        <ArrowRightIcon className="h-2 w-2 md:h-3 md:w-3" />
                                        <span >
                                            Network
                                        </span>
                                    </div>
                                    :
                                    <div className="flex items-center space-x-0.5 md:space-x-2 text-sm md:text-base ">
                                        <span >
                                            Network
                                        </span>
                                        <ArrowRightIcon className="h-2 w-2 md:h-3 md:w-3" />
                                        <span className="">
                                            Exchange
                                        </span>
                                    </div>
                            }
                        </div>
                    </RadioGroup.Option>
                ))}
            </div>
        </RadioGroup>
    )
}
export default OptionToggle