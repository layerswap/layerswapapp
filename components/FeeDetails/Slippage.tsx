import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient"
import { SwapValues } from "."
import { Info, Pencil } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { useCallback, useEffect, useRef, useState, forwardRef } from "react"
import { useClickOutside } from "@/hooks/useClickOutside"
import clsx from "clsx"
import { useSlippageStore } from "@/stores/slippageStore"

type SlippageProps = {
    quoteData: SwapQuote | undefined
    values: SwapValues
    disableEditingBackground?: boolean
}
const HIGH_SLIPPAGE_THRESHOLD_PERCENT = 4.2;

export const Slippage = ({ quoteData, values, disableEditingBackground }: SlippageProps) => {
    const [editingSlippage, setEditingSlippage] = useState(false)
    const { ref, isActive, activate } = useClickOutside<HTMLDivElement>()
    const { slippage, setSlippage, autoSlippage, setAutoSlippage } = useSlippageStore()
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [editingCustomSlippage, setEditingCustomSlippage] = useState(false)

    const currentSlippagePercent = ((slippage ?? quoteData?.slippage) ?? 0) * 100
    const isHighSlippage = currentSlippagePercent > HIGH_SLIPPAGE_THRESHOLD_PERCENT

    useEffect(() => {
        if (!isActive && editingSlippage) {
            setEditingSlippage(false)
            setEditingCustomSlippage(false)
        }
    }, [isActive, editingSlippage])

    const handleAutoButtonClick = useCallback(() => {
        if (autoSlippage) {
            setEditingCustomSlippage(true)
            setTimeout(() => inputRef.current?.focus(), 0)
        }
        else {
            setEditingCustomSlippage(false)
        }
        setSlippage(undefined)
        setAutoSlippage(!autoSlippage)
    }, [autoSlippage, setAutoSlippage, setEditingCustomSlippage, setSlippage])

    return (
        <div ref={ref} className={clsx("flex items-center w-full justify-between gap-1 text-sm py-1", disableEditingBackground ? "px-3" : "px-2", { "bg-secondary-700 rounded-xl": editingSlippage && !disableEditingBackground })}>
            <div className="inline-flex items-center text-left py-2">
                <label className="flex items-center gap-1">
                    <span className={clsx(isHighSlippage ? "text-warning-foreground" : "text-secondary-text")}>
                        {editingSlippage ? (isHighSlippage ? "High" : "Slippage") : (isHighSlippage ? "High slippage" : "Slippage")}
                    </span>
                    <Tooltip openOnClick>
                        <TooltipTrigger asChild>
                            <span>
                                <Info className={clsx('w-4 h-4', isHighSlippage ? "text-warning-foreground" : "")} />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl" side="top" align="start" alignOffset={-30}>
                            <p>Your transaction will be refunded if the price moves more than the slippage percentage.</p>
                        </TooltipContent>
                    </Tooltip>
                </label>
            </div>
            {
                !editingSlippage &&
                <div className="text-right flex items-center gap-1">
                    {!slippage && <div className="text-secondary-text">(Auto)</div>}
                    <span className={clsx(isHighSlippage ? "text-warning-foreground" : "text-primary-text")}>
                        {currentSlippagePercent.toFixed(2)}%
                    </span>
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
                            className={clsx("flex items-center gap-1 text-sm px-2 h-8 border border-secondary-300 rounded-lg font-normal leading-4 cursor-pointer", isHighSlippage && "shadow-[inset_0_0_0_1px] shadow-warning-foreground")}
                            onClick={() => {
                                if (!slippage && quoteData?.slippage) {
                                    setSlippage(quoteData.slippage);
                                }
                                setEditingCustomSlippage(true);
                                setTimeout(() => inputRef.current?.focus(), 0)
                                setAutoSlippage(false)
                            }}>
                            <span className={clsx(isHighSlippage ? "text-warning-foreground" : "text-primary-text")}>
                                {currentSlippagePercent.toFixed(2)}
                            </span>
                            <span className="text-secondary-text">
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
                            "rounded-lg px-3 h-8 flex items-center font-medium leading-4 cursor-pointer border transition-colors duration-300",
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
    const [previousValidValue, setPreviousValidValue] = useState<number | undefined>(valueDecimal !== undefined ? valueDecimal * 100 : undefined)

    useEffect(() => {
        const newPercent = valueDecimal !== undefined ? Math.round(valueDecimal * 10000) / 100 : undefined
        setLocalPercent(newPercent)
        if (newPercent !== undefined && newPercent >= 0.1 && newPercent <= 5) {
            setPreviousValidValue(newPercent)
        }
    }, [valueDecimal])

    const invalid = localPercent !== undefined && (localPercent < 0.1 || localPercent > 5)
    const isHighSlippage = localPercent !== undefined && localPercent > HIGH_SLIPPAGE_THRESHOLD_PERCENT

    useEffect(() => {
        const t = setTimeout(() => {
            if (invalid) return
            if (localPercent !== undefined && localPercent >= 0.1 && localPercent <= 5) setPreviousValidValue(localPercent)
            onDebouncedChange(localPercent !== undefined ? Math.round(localPercent * 100) / 10000 : undefined)
        }, 300)
        return () => clearTimeout(t)
    }, [localPercent, invalid, onDebouncedChange])

    return (
        <div className="relative">
            <Popover open={invalid}>
                <PopoverTrigger asChild>
                    <div
                        className={clsx(
                            "flex items-center gap-1 text-sm px-2 h-8 w-16 border border-secondary-300 rounded-lg font-normal leading-4 focus-within:outline-none focus-within:ring-0",
                            invalid && "animate-shake",
                            isHighSlippage && "shadow-[inset_0_0_0_1px] shadow-warning-foreground"
                        )}
                    >
                        <input
                            type="number"
                            ref={ref}
                            autoComplete="off"
                            autoFocus={false}
                            title=""
                            className={clsx("w-8 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-transparent focus:shadow-none text-base leading-3.5 p-0 text-right",
                                isHighSlippage ? "text-warning-foreground" : "text-primary-text"
                            )}
                            value={localPercent ?? ""}
                            onChange={(e) => {
                                const next = e.target.value === "" ? undefined : Number(e.target.value)
                                if (!Number.isNaN(next as number)) {
                                    onEditing?.()
                                    setLocalPercent(next)
                                }
                            }}
                            onBlur={() => {
                                if (localPercent === undefined || localPercent === 0 || invalid) {
                                    setLocalPercent(previousValidValue)
                                    if (previousValidValue !== undefined) {
                                        onDebouncedChange(Math.round(previousValidValue * 100) / 10000)
                                    }
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key == "Enter") {
                                    e.preventDefault();
                                    return false;
                                }
                            }}
                        />
                        <span className="text-secondary-text">%</span>
                    </div>
                </PopoverTrigger>
                <PopoverContent side="top" align="center" className="text-xs">
                    Slippage can not be out of 0.1% - 5% range.
                </PopoverContent>
            </Popover>
        </div >
    )
})