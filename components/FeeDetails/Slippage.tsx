import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient"
import { SwapValues } from "."
import { Info, Pencil } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"
import { useCallback, useEffect, useRef, useState } from "react"
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
    console.log("editingCustomSlippage", editingCustomSlippage)
    console.log("autoSlippage", autoSlippage)
    console.log("slippage", slippage)
    console.log("editingSlippage", editingSlippage)

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
                    <span>{slippage || quoteData?.slippage}%</span>
                    <div
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
                        !autoSlippage && <>
                            <QuickAction value={0.5} />
                            <QuickAction value={1} />
                            <QuickAction value={2.5} />
                        </>
                    }

                    {!editingCustomSlippage &&
                        <div
                            className="flex items-center gap-1 text-secondary-text px-2 py-2 -my-1 border border-secondary-300 rounded-lg font-medium leading-4 cursor-pointer"
                            onClick={() => {
                                setEditingCustomSlippage(true);
                                setTimeout(() => inputRef.current?.focus(), 0)
                                setAutoSlippage(false)
                            }}>
                            <span>
                                {quoteData?.slippage}
                            </span>
                            <span>
                                %
                            </span>
                        </div>
                    }
                    {
                        editingCustomSlippage &&
                        <div className="flex items-center gap-1 text-secondary-text px-2 py-2 -my-1 border border-secondary-300 rounded-lg font-medium leading-4 focus-within:outline-none focus-within:ring-0">
                            <input
                                type="number"
                                inputMode="decimal"
                                max={80}
                                ref={inputRef}
                                className="w-10 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-transparent focus:shadow-none text-primary-text text-sm leading-none p-0 text-right"
                                value={slippage ?? ""}
                                onChange={(e) => {
                                    const next = e.target.value === "" ? undefined : Number(e.target.value)
                                    if (!Number.isNaN(next as number)) {
                                        setAutoSlippage(false)
                                        setSlippage(next as number | undefined)
                                    }
                                }}
                            />
                            <span>%</span>
                        </div>
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
}
const QuickAction = ({ value }: QuickActionProps) => {
    const { slippage, setSlippage } = useSlippageStore()
    const [flash, setFlash] = useState(false)

    return (
        <button
            type="button"
            onClick={() => {
                setSlippage(value)
                setFlash(true)
                setTimeout(() => setFlash(false), 600)
            }}
            className={clsx(
                "flex items-center text-secondary-text px-2 py-1 border rounded-lg font-medium leading-4 cursor-pointer transition-colors ease-in-out duration-200",
                flash ? "bg-secondary-300" : "bg-secondary-500"
            )}>
            <span>{value}</span>
            <span>%</span>
        </button>
    )
}