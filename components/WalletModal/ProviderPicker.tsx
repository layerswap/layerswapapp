import { FC, useMemo, useState } from "react";
import { WalletProvider } from "../../Models/WalletProvider";
import clsx from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Checkbox } from "../shadcn/checkbox";
import MenuIcon from "../icons/MenuIcon";

export const ProviderPicker: FC<{ providers: WalletProvider[], selectedProviderNames: string[], setSelectedProviderNames: (providerNames: string[]) => void }> = ({ providers, selectedProviderNames, setSelectedProviderNames }) => {
    const values = useMemo(() => providers.map(p => p.name).sort(), [providers])
    const [open, setOpen] = useState(false)

    const onSelect = (item: string) => {
        if (selectedProviderNames.includes(item)) {
            const next = selectedProviderNames.filter(p => p !== item)
            setSelectedProviderNames(next)
        } else {
            setSelectedProviderNames([...selectedProviderNames, item])
        }
    }

    const handleClear = () => {
        setSelectedProviderNames([])
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={() => setOpen(!open)}>
            <PopoverTrigger
                className={clsx('p-2 border border-secondary-500 rounded-lg bg-secondary-600 hover:brightness-125  relative overflow-visible z-50', {
                    'bg-secondary-300! brightness-125': selectedProviderNames.length > 0,
                })}
            >
                <MenuIcon className="h-6 w-6 text-secondary-text" />
                {selectedProviderNames.length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary-300 border border-secondary-700 flex items-center justify-center text-[10px] font-medium text-primary-text z-50">
                        {selectedProviderNames.length}
                    </div>
                )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[130px]! text-primary-text! p-2 space-y-1 bg-secondary-500! rounded-xl!" style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}>
                {
                    values.map((item, index) => (
                        <div key={index} onClick={() => onSelect(item)} className="px-2 py-1 text-left flex items-center w-full gap-2.5 hover:bg-secondary-400 rounded-lg transition-colors duration-200 text-secondary-text cursor-pointer">
                            <Checkbox
                                id={item}
                                checked={selectedProviderNames.includes(item)}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => onSelect(item)}
                            />
                            <label htmlFor={item} className="w-full cursor-pointer text-sm leading-[17px]" onClick={(e) => e.preventDefault()}>
                                {item}
                            </label>
                        </div>
                    ))
                }
                {selectedProviderNames.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="w-full px-3 py-1 mt-1 text-sm font-medium text-secondary-text hover:text-primary-text bg-secondary-300 hover:bg-secondary-200 rounded-lg transition-colors duration-200"
                    >
                        Clear
                    </button>
                )}
            </PopoverContent>
        </Popover>
    )
}