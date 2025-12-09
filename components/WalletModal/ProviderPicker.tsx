import { Dispatch, FC, SetStateAction, useState } from "react";
import { WalletProvider } from "../../Models/WalletProvider";
import { SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Checkbox } from "../shadcn/checkbox";

export const ProviderPicker: FC<{ providers: WalletProvider[], selectedProviderName: string | undefined, setSelectedProviderName: Dispatch<SetStateAction<string | undefined>> }> = ({ providers, selectedProviderName, setSelectedProviderName }) => {
    const values = providers.map(p => p.name)

    const onSelect = (item: string) => {
        setOpen(false)
        if (selectedProviderName === item) return setSelectedProviderName(undefined)
        setSelectedProviderName(item)
    }

    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={() => setOpen(!open)}>
            <PopoverTrigger
                className={clsx('p-3 border border-secondary-500 rounded-lg bg-secondary-600 hover:brightness-125', {
                    'bg-secondary-500! brightness-125': !!selectedProviderName,
                })}
            >
                <SlidersHorizontal className="h-4 w-4 text-secondary-text" />
            </PopoverTrigger>
            <PopoverContent align="end" className="min-w-40 text-primary-text! p-2 space-y-1 bg-secondary-600! rounded-xl!">
                {
                    values.sort().map((item, index) => (
                        <div key={index} className="px-3 py-1 text-left flex items-center w-full gap-3 hover:bg-secondary-800 rounded-lg transition-colors duration-200 text-secondary-text cursor-pointer">
                            <Checkbox
                                id={item}
                                checked={selectedProviderName === item}
                                onClick={() => onSelect(item)}
                            />
                            <label htmlFor={item} className="w-full cursor-pointer">
                                {item}
                            </label>
                        </div>
                    ))
                }
            </PopoverContent>
        </Popover>
    )
}