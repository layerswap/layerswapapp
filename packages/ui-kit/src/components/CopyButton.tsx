import * as Tooltip from "@radix-ui/react-tooltip"
import { Check } from "lucide-react"
import { useState, type FC, type ReactNode } from "react"
import clsx from "clsx"
import CopyIcon from "./CopyIcon"
import useCopyClipboard from "@/hooks/useCopyClipboard"
import { useOptionalWalletUi } from "./internal/WalletUiContext"

interface CopyButtonProps {
    className?: string
    toCopy: string | number
    children?: ReactNode
    iconSize?: number
    iconClassName?: string
    disabled?: boolean
}

const CopyButton: FC<CopyButtonProps> = ({ className, toCopy, children, iconSize, iconClassName, disabled = false, }) => {
    const [isCopied, setCopied] = useCopyClipboard()
    const [isTooltipOpen, setTooltipOpen] = useState(false)
    const walletUi = useOptionalWalletUi()

    const handleCopyClick = () => {
        if (disabled) return
        setCopied(toCopy)
        setTooltipOpen(true)
    }

    const container = walletUi?.rootRef.current
        ?? (typeof document !== "undefined" ? document.getElementById("widget") : null)

    return (
        <Tooltip.Provider delayDuration={0}>
            <Tooltip.Root delayDuration={400} open={isTooltipOpen} onOpenChange={setTooltipOpen}>
                <Tooltip.Trigger>
                    <div
                        className={clsx(
                            className,
                            "flex items-center gap-1",
                            "cursor-pointer",
                            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                        onClick={handleCopyClick}
                        tabIndex={disabled ? -1 : 0}
                        aria-disabled={disabled}
                    >
                        {isCopied ? (
                            <>
                                <Check
                                    className={iconClassName}
                                    width={iconSize ? iconSize : 16}
                                    height={iconSize ? iconSize : 16}
                                />
                                {children}
                            </>
                        ) : (
                            <>
                                <CopyIcon
                                    className={iconClassName}
                                    width={iconSize ? iconSize : 16}
                                    height={iconSize ? iconSize : 16}
                                />
                                {children}
                            </>
                        )}
                    </div>
                </Tooltip.Trigger>
                <Tooltip.Portal container={container}>
                    <div className="layerswap-styles">
                        <Tooltip.Content sideOffset={0} className="z-50 origin-(--radix-tooltip-content-transform-origin) rounded-xl border border-secondary-600 bg-secondary-800 px-3 py-1.5 text-xs text-secondary-text data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                            <p>{isCopied ? "Copied" : "Copy"}</p>
                        </Tooltip.Content>
                    </div>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    )
}

export default CopyButton
