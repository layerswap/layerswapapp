import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient"
import { SwapValues } from "."
import { Info, Pencil } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { useCallback, useEffect, useRef, useState, forwardRef } from "react"
import { useClickOutside } from "@/hooks/useClickOutside"
import clsx from "clsx"
import { useSlippageStore } from "@/stores/slippageStore"

type SlippageProps = {
    quoteData: SwapQuote | undefined
    values: SwapValues
}

export const Slippage = ({ quoteData, values }: SlippageProps) => {
    const [editingSlippage, setEditingSlippage] = useState(false)
    const { ref, isActive, activate } = useClickOutside<HTMLDivElement>()
    const { slippage, setSlippage } = useSlippageStore()
    const [autoSlippage, setAutoSlippage] = useState(!slippage)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [editingCustomSlippage, setEditingCustomSlippage] = useState(false)

    useEffect(() => {
        if (!isActive && editingSlippage) {
            setEditingSlippage(false)
            setEditingCustomSlippage(false)
        }
    }, [isActive, editingSlippage])

    const handleAutoButtonClick = useCallback(() => {
        setAutoSlippage(auto => {
            if (auto) {
                setEditingCustomSlippage(true)
                setTimeout(() => inputRef.current?.focus(), 0)
            }
            else {
                setEditingCustomSlippage(false)
            }
            setSlippage(undefined)
            return !auto
        })

    }, [setAutoSlippage, setEditingCustomSlippage, setSlippage, inputRef])

    return (
        <div ref={ref} className={clsx("flex items-center w-full justify-between gap-1 text-sm px-2 py-1", { "bg-secondary-700 rounded-xl": editingSlippage })}>
            <div className="inline-flex items-center text-left text-secondary-text py-2">
                <label className="flex items-center gap-1">
                    <span>Slippage</span>
                    <Tooltip openOnClick>
                        <TooltipTrigger asChild>
                            <Info className='w-4 h-4' />
                        </TooltipTrigger>
                        <TooltipContent className="pointer-events-none w-80 grow p-2 !border-none !bg-secondary-300 text-xs rounded-xl" side="top" align="start" alignOffset={-30}>
                            <p>Your transaction will be refunded if the price moves more than the slippage percentage.</p>
                        </TooltipContent>
                    </Tooltip>
                </label>
            </div>
            {
                !editingSlippage &&
                <div className="text-right text-primary-text flex items-center gap-1">
                    {!slippage && <div className="text-secondary-text">(Auto)</div>}
                    <span>{(((slippage ?? quoteData?.slippage) ?? 0) * 100).toFixed(2)}%</span>
                    <div
                        data-attr="edit-slippage"
                        onClick={() => { setEditingSlippage(true); activate() }}
                        className="cursor-pointer hover:bg-secondary-400 p-1 bg-secondary-300 rounded-md text-secondary-text">
                        <Pencil className="h-3 w-3" />
                    </div>
                </div>
            }
            {
                editingSlippage &&
                <div className="flex items-center gap-1">
                    {
                        !autoSlippage && <span className="flex items-center gap-1 max-sm:hidden">
                            <QuickAction value={0.5} />
                            <QuickAction value={1} />
                            <QuickAction value={2.5} />
                        </span>
                    }

                    {!editingCustomSlippage &&
                        <div
                            className="flex items-center gap-1 text-secondary-text text-sm px-2 py-2 -my-1 border border-secondary-300 rounded-lg font-normal leading-4 cursor-pointer"
                            onClick={() => {
                                setEditingCustomSlippage(true);
                                setTimeout(() => inputRef.current?.focus(), 0)
                                setAutoSlippage(false)
                            }}>
                            <span>{(((quoteData?.slippage) ?? 0) * 100).toFixed(2)}</span>
                            <span>
                                %
                            </span>
                        </div>
                    }
                    {
                        editingCustomSlippage &&
                        <SlippageInput
                            ref={inputRef}
                            valueDecimal={slippage}
                            onEditing={() => setAutoSlippage(false)}
                            onDebouncedChange={(decimal) => setSlippage(decimal)}
                        />
                    }
                    <div
                        onClick={handleAutoButtonClick}
                        className={clsx(
                            "rounded-lg  px-3 py-2 -my-1 font-medium leading-4 cursor-pointer border transition-colors duration-300",
                            autoSlippage ? "bg-secondary-300 border-secondary-100" : "bg-secondary-500 border-transparent",
                        )}>
                        Auto
                    </div>
                </div>

            }

        </div>
    )
}
type QuickActionProps = {
    value: number
    className?: string
}
const QuickAction = ({ value, className }: QuickActionProps) => {
    const { setSlippage } = useSlippageStore()
    const [flash, setFlash] = useState(false)

    return (
        <button
            type="button"
            onClick={() => {
                setSlippage(value / 100)
                setFlash(true)
                setTimeout(() => setFlash(false), 600)
            }}
            className={clsx(
                "flex items-center text-secondary-text px-2 py-1 border text-xs rounded-lg font-normal leading-4 cursor-pointer transition-colors ease-in-out duration-200",
                flash ? "bg-secondary-300" : "bg-secondary-500"
            )}>
            <span>{value.toFixed(2)}</span>
            <span>%</span>
        </button>
    )
}

type SlippageInputProps = {
    valueDecimal: number | undefined
    onDebouncedChange: (decimal: number | undefined) => void
    onEditing?: () => void
}

const SlippageInput = forwardRef<HTMLInputElement, SlippageInputProps>(function SlippageInput({ valueDecimal, onDebouncedChange, onEditing }, ref) {
    const [localPercent, setLocalPercent] = useState<number | undefined>(valueDecimal !== undefined ? valueDecimal * 100 : undefined)

    useEffect(() => {
        setLocalPercent(valueDecimal !== undefined ? Math.round(valueDecimal * 10000) / 100 : undefined)
    }, [valueDecimal])

    const invalid = localPercent !== undefined && (localPercent < 0.1 || localPercent > 5)

    useEffect(() => {
        const t = setTimeout(() => {
            if (invalid) return
            onDebouncedChange(localPercent !== undefined ? Math.round(localPercent * 100) / 10000 : undefined)
        }, 300)
        return () => clearTimeout(t)
    }, [localPercent, invalid])

    return (
        <Popover open={invalid}>
            <PopoverTrigger asChild>
                <div className={clsx("flex items-center gap-1 text-secondary-text text-sm px-2 py-2 -my-1 border rounded-lg font-normal leading-4 focus-within:outline-none focus-within:ring-0 border-secondary-300",
                    invalid ? "animate-shake" : "")}
                >
                    <input
                        type="number"
                        ref={ref}
                        autoComplete="off"
                        autoFocus={false}
                        title=""
                        className={clsx("w-10 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-transparent focus:shadow-none text-primary-text text-base leading-3.5 p-0 text-right")}
                        value={localPercent}
                        onChange={(e) => {
                            const next = e.target.value === "" ? undefined : Number(e.target.value)
                            if (!Number.isNaN(next as number)) {
                                onEditing?.()
                                setLocalPercent(next)
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key == "Enter") {
                                e.preventDefault();
                                return false;
                            }
                        }}
                    />
                    <span>%</span>
                </div>
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="text-xs">
                Slippage can not be out of 0.1% - 5% range.
            </PopoverContent>
        </Popover>
    )
})