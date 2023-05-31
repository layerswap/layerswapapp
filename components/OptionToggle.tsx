import { RadioGroup } from "@headlessui/react";
import { ArrowRight } from "lucide-react";
import { FC } from "react";
import { SwapType } from "../lib/layerSwapApiClient";
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
        <RadioGroup value={items.find(i => i.value === value)} disabled={disabled} onChange={onchange} className="mt-2 w-full my-4">
            <RadioGroup.Label className="font-normal text-primary-text text-sm">{label}</RadioGroup.Label>
            <div className={`grid grid-cols-${items?.length} gap-1 md:gap-2 p-0.5 md:p-2 rounded-lg bg-secondary-700 border-secondary-500 border`}>
                {items.map((option) => (
                    <RadioGroup.Option
                        key={option.value}
                        value={option}
                        className={({ checked }) =>
                            classNames(
                                option.isEnabled ? 'cursor-pointer focus:outline-none' : 'opacity-25 cursor-not-allowed',
                                checked
                                    ? 'bg-secondary-500 border-transparent text-white'
                                    : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200',
                                `border rounded-md p-1 flex items-center justify-center text-sm font-medium sm:flex-1 relative`
                            )
                        }
                        disabled={!option.isEnabled}>
                        {
                            option.value === SwapType.OnRamp &&
                            <div className="flex items-center md:p-0 p-1.5 text-xs md:text-base">
                                On-Ramp
                            </div>
                        }
                        {
                            option.value === SwapType.OffRamp &&
                            <div className="flex items-center space-x-1 md:p-0 p-1.5 text-xs md:text-base ">
                                Off-Ramp
                            </div>
                        }
                        {
                            option.value === SwapType.CrossChain &&
                            <div className="inline-flex items-center ">
                                <span className="flex items-center space-x-1 md:p-0 p-1.5 text-xs md:text-base">
                                    Cross-Chain
                                </span>
                                <span className="absolute ml-1 -top-1 -right-2 shadow-sm rounded bg-primary px-2 text-[10px] leading-4 font-semibold text-white"> New </span>
                            </div>

                        }
                    </RadioGroup.Option>
                ))}
            </div>
        </RadioGroup>
    )
}
export default OptionToggle