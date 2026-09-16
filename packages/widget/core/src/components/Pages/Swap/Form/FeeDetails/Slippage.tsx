import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient"
import { SwapValues } from "."
import { Info, Pencil } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { useClickOutside } from "@/hooks/useClickOutside"
import clsx from "clsx"
import { useSlippageStore } from "@/stores/slippageStore"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import { formReceiveSettingsScope, isTokenSwap, quotedMinimumInput, receiveSettingsError, resolveReceiveSettings } from "@/lib/receiveSettings"
import type { QuoteError } from "@/hooks/useFee"

type SlippageProps = {
    quoteData: SwapQuote | undefined
    values: SwapValues
    disableEditingBackground?: boolean
    allowMinimumReceive?: boolean
    quoteError?: QuoteError
    isQuoteLoading?: boolean
}
const HIGH_SLIPPAGE_THRESHOLD_PERCENT = 4.2

export const Slippage = ({ quoteData, values, disableEditingBackground, allowMinimumReceive, quoteError, isQuoteLoading }: SlippageProps) => {
    const [editingSlippage, setEditingSlippage] = useState(false)
    const [editingMinimum, setEditingMinimum] = useState(false)
    const [editingCustomSlippage, setEditingCustomSlippage] = useState(false)
    const [slippageDraft, setSlippageDraft] = useState('')
    const { ref, isActive, activate } = useClickOutside<HTMLDivElement>()
    const storedSettings = useSlippageStore(state => state.receiveSettings)
    const setReceiveSettings = useSlippageStore(state => state.setReceiveSettings)
    const clearSlippage = useSlippageStore(state => state.clearSlippage)
    const scope = formReceiveSettingsScope(values)
    const settings = resolveReceiveSettings(storedSettings, scope, isTokenSwap(values.fromAsset?.symbol, values.toAsset?.symbol))
    const inputRef = useRef<HTMLInputElement>(null)
    const minimumInputRef = useRef<HTMLInputElement>(null)
    const id = useId()

    const autoSlippage = settings.mode === 'auto'
    const currentSlippagePercent = settings.mode === 'slippage' ? Number(settings.percent) : quoteData?.slippage === undefined ? undefined : quoteData.slippage * 100
    const slippageText = currentSlippagePercent !== undefined && Number.isFinite(currentSlippagePercent) ? currentSlippagePercent.toFixed(2) : '—'
    const isHighSlippage = currentSlippagePercent !== undefined && currentSlippagePercent > HIGH_SLIPPAGE_THRESHOLD_PERCENT
    const minimum = settings.mode === 'minimum' ? settings.amount : quotedMinimumInput(quoteData?.min_receive_amount)
    const validationError = receiveSettingsError(settings)
    const requestError = quoteError?.response?.data?.error?.message || quoteError?.message
    const error = validationError || (!isQuoteLoading && requestError)
    const token = values.toAsset?.asset

    useEffect(() => {
        if (!isActive) {
            setEditingSlippage(false)
            setEditingMinimum(false)
            setEditingCustomSlippage(false)
        }
    }, [isActive])

    useEffect(() => {
        if (editingMinimum) minimumInputRef.current?.focus()
        else if (editingCustomSlippage) inputRef.current?.focus()
    }, [editingMinimum, editingCustomSlippage])

    const editSlippage = () => {
        setSlippageDraft(String(currentSlippagePercent ?? 0.5))
        setEditingMinimum(false)
        setEditingCustomSlippage(true)
    }

    return (
        <div ref={ref}>
            {allowMinimumReceive && (
                <div className={clsx("grid grid-cols-[auto_minmax(0,1fr)] items-center w-full gap-2 text-sm py-2", disableEditingBackground ? "px-3" : "px-2")}>
                    <label htmlFor={`${id}-minimum`} className="text-secondary-text" title={`Minimum ${token} received after fees and refuel`}>Receive at least</label>
                    {editingMinimum ? (
                        <div className="flex items-center justify-self-end gap-2 min-w-0 max-w-full rounded-lg border border-secondary-300 px-2 h-7 focus-within:border-primary-text">
                            <input
                                id={`${id}-minimum`}
                                ref={minimumInputRef}
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                aria-label={`Minimum receive in ${token}`}
                                aria-invalid={!!error}
                                aria-describedby={`${id}-minimum-hint${error ? ` ${id}-error` : ''}`}
                                className="w-40 min-w-0 bg-transparent border-none outline-none text-base text-right text-primary-text p-0"
                                value={minimum}
                                onChange={e => setReceiveSettings({ mode: 'minimum', amount: e.target.value, scope, precision: values.toAsset?.precision ?? values.toAsset?.decimals ?? 0 })}
                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                            />
                            <span className="text-secondary-text shrink-0">{token}</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            aria-label="Edit minimum receive"
                            data-attr="edit-min-receive"
                            onClick={() => {
                                setEditingMinimum(true)
                                setEditingCustomSlippage(false)
                                activate()
                            }}
                            className="flex items-center justify-self-end gap-1 h-7 text-primary-text min-w-0 max-w-full rounded-md focus-visible:outline focus-visible:outline-2"
                        >
                            <span className="truncate text-right" title={`${minimum || '—'} ${token}`}>{minimum || '—'} {token}</span>
                            <span className="shrink-0 hover:bg-secondary-400 p-1 bg-secondary-300 rounded-md text-secondary-text"><Pencil className="h-3 w-3" /></span>
                        </button>
                    )}
                    <span id={`${id}-minimum-hint`} className="sr-only">Minimum {token} received after fees and refuel. Your send amount stays the same.</span>
                </div>
            )}
            <div className={clsx("flex flex-wrap items-center w-full justify-between gap-1 text-sm py-1", disableEditingBackground ? "px-3" : "px-2", { "bg-secondary-700 rounded-xl": editingSlippage && !disableEditingBackground })}>
                <div className="inline-flex items-center text-left py-2 gap-1">
                    <span className={clsx(isHighSlippage ? "text-warning-foreground" : "text-secondary-text")}>
                        {isHighSlippage ? "High slippage" : "Slippage"}
                    </span>
                    <Tooltip openOnClick>
                        <TooltipTrigger asChild>
                            <button type="button" aria-label="About slippage" className="text-secondary-text rounded-sm focus-visible:outline focus-visible:outline-2">
                                <Info className={clsx('w-4 h-4', isHighSlippage && "text-warning-foreground")} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl" side="top" align="start" alignOffset={-30}>
                            <p>{isHighSlippage ? "High slippage increases the risk of receiving significantly less than the quoted amount." : "Your transaction will be refunded if the price moves more than the slippage percentage."}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                {!editingSlippage ? (
                    <div className="text-right flex items-center gap-1 h-8">
                        {autoSlippage && <span className="text-secondary-text">(Auto)</span>}
                        <span className={clsx(isHighSlippage ? "text-warning-foreground" : "text-primary-text")}>{slippageText}%</span>
                        <button
                            type="button"
                            aria-label="Edit slippage"
                            data-attr="edit-slippage"
                            onClick={() => { setEditingSlippage(true); activate() }}
                            className="cursor-pointer hover:bg-secondary-400 p-1 bg-secondary-300 rounded-md text-secondary-text focus-visible:outline focus-visible:outline-2">
                            <Pencil className="h-3 w-3" />
                        </button>
                        {settings.mode === 'minimum' && <button type="button" onClick={clearSlippage} className="rounded-lg px-3 h-8 bg-secondary-500 border border-secondary-300 text-primary-text">Auto</button>}
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        {!autoSlippage && <span className="flex items-center gap-1 max-sm:hidden">
                            {[0.5, 1, 2.5].map(value => <QuickAction key={value} value={value} onClick={() => { setReceiveSettings({ mode: 'slippage', percent: String(value) }); setEditingMinimum(false) }} />)}
                        </span>}
                        {editingCustomSlippage ? (
                            <div className={clsx("flex items-center gap-1 text-sm px-2 h-8 w-20 border border-secondary-300 rounded-lg font-normal leading-4 focus-within:border-primary-text", isHighSlippage && "shadow-[inset_0_0_0_1px] shadow-warning-foreground")}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    aria-label="Slippage percentage"
                                    aria-invalid={settings.mode === 'slippage' && !!validationError}
                                    aria-describedby={error ? `${id}-error` : undefined}
                                    className="w-full bg-transparent border-none outline-none text-base p-0 text-right text-primary-text"
                                    value={settings.mode === 'slippage' ? settings.percent : slippageDraft}
                                    onChange={e => setReceiveSettings({ mode: 'slippage', percent: e.target.value })}
                                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                                />
                                <span className="text-secondary-text">%</span>
                            </div>
                        ) : (
                            <button type="button" aria-label="Enter slippage percentage" className="flex items-center gap-1 text-sm px-2 h-8 border border-secondary-300 rounded-lg font-normal leading-4" onClick={editSlippage}>
                                <span className={clsx(isHighSlippage ? "text-warning-foreground" : "text-primary-text")}>{slippageText}</span>
                                <span className="text-secondary-text">%</span>
                            </button>
                        )}
                        <button
                            type="button"
                            aria-pressed={autoSlippage}
                            onClick={() => {
                                if (autoSlippage) editSlippage()
                                else { clearSlippage(); setEditingMinimum(false); setEditingCustomSlippage(false) }
                            }}
                            className={clsx("rounded-lg px-3 h-8 flex items-center font-medium leading-4 border transition-colors duration-300", autoSlippage ? "bg-secondary-300 border-secondary-100" : "bg-secondary-500 border-transparent")}
                        >Auto</button>
                    </div>
                )}
            </div>
            {error && <p id={`${id}-error`} role="alert" className="px-2 py-2 text-xs text-warning-foreground">{error} Edit the value or return to Auto.</p>}
            {!error && !quoteData && !isQuoteLoading && allowMinimumReceive && <p role="status" className="px-2 py-2 text-xs text-secondary-text">No quote available. Edit the minimum receive or slippage, or return to Auto.</p>}
        </div>
    )
}

const QuickAction = ({ value, onClick }: { value: number; onClick: () => void }) => {
    const [flash, setFlash] = useState(false)
    useEffect(() => {
        if (!flash) return
        const timeout = setTimeout(() => setFlash(false), 600)
        return () => clearTimeout(timeout)
    }, [flash])
    return (
        <button type="button" onClick={() => { onClick(); setFlash(true) }} className={clsx("flex items-center text-secondary-text px-2 py-1 border text-xs rounded-lg font-normal leading-4 cursor-pointer transition-colors ease-in-out duration-200", flash ? "bg-secondary-300" : "bg-secondary-500")}>
            <span>{value.toFixed(2)}</span><span>%</span>
        </button>
    )
}
