import * as Checkbox from "@radix-ui/react-checkbox";
import * as Popover from "@radix-ui/react-popover";
import { Check } from "lucide-react";
import { FC, useMemo, useRef, useState } from "react";
import type { WalletConnectionProvider } from "@layerswap/wallet-core/types"
import clsx from "clsx";
import ProviderFilterIcon from "./ProviderFilterIcon";

export const ProviderPicker: FC<{ providers: WalletConnectionProvider[], selectedProviderNames: string[], setSelectedProviderNames: (providerNames: string[]) => void }> = ({ providers, selectedProviderNames, setSelectedProviderNames }) => {
    const values = useMemo(() => providers.map(p => p.name).sort(), [providers])
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

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
        <div ref={rootRef}>
            <Popover.Root open={open} onOpenChange={setOpen}>
                <Popover.Trigger
                    className={clsx('p-2 border border-secondary-500 rounded-lg bg-secondary-600 hover:brightness-125  relative overflow-visible z-50', {
                        'bg-secondary-300! brightness-125': selectedProviderNames.length > 0,
                    })}
                >
                    <ProviderFilterIcon className="h-6 w-6 text-secondary-text" />
                    {selectedProviderNames.length > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary-300 border border-secondary-700 flex items-center justify-center text-[10px] font-medium text-primary-text z-50">
                            {selectedProviderNames.length}
                        </div>
                    )}
                </Popover.Trigger>
                <Popover.Portal container={rootRef.current}>
                    <Popover.Content
                        align="end"
                        sideOffset={4}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        className="z-50 w-[130px]! max-w-72 origin-(--radix-popover-content-transform-origin) rounded-xl! bg-secondary-500! p-2 text-sm text-primary-text! shadow-sm ring-1 ring-primary-text/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-primary-text/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 space-y-1"
                        style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}
                    >
                        {
                            values.map((item, index) => (
                                <div key={index} onClick={() => onSelect(item)} className="px-2 py-1 text-left flex items-center w-full gap-2.5 hover:bg-secondary-400 rounded-lg transition-colors duration-200 text-secondary-text cursor-pointer">
                                    <Checkbox.Root
                                        id={item}
                                        checked={selectedProviderNames.includes(item)}
                                        onClick={(e) => e.stopPropagation()}
                                        onCheckedChange={() => onSelect(item)}
                                        className="peer h-3 w-3 shrink-0 rounded border border-secondary-text data-[state=checked]:border-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-text data-[state=checked]:text-secondary-800"
                                    >
                                        <Checkbox.Indicator className="flex items-center justify-center text-current">
                                            <Check className="h-3 w-3" />
                                        </Checkbox.Indicator>
                                    </Checkbox.Root>
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
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </div>
    )
}
