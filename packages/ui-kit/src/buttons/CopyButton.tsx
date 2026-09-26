import { Check } from "lucide-react"
import { useEffect, useLayoutEffect, useState, type FC, type ReactNode, type RefObject } from "react"
import clsx from "clsx"
import CopyIcon from "../icons/CopyIcon"
import { useCopyClipboard } from "@layerswap/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"

const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect

interface CopyButtonProps {
    className?: string
    toCopy: string | number
    children?: ReactNode
    iconSize?: number
    iconClassName?: string
    disabled?: boolean
    portalContainerRef?: RefObject<HTMLElement | null>
}

const CopyButton: FC<CopyButtonProps> = ({ className, toCopy, children, iconSize, iconClassName, disabled = false, portalContainerRef, }) => {
    const [isCopied, setCopied] = useCopyClipboard()
    const [isTooltipOpen, setTooltipOpen] = useState(false)
    const [container, setContainer] = useState<HTMLElement | undefined>(undefined)

    const handleCopyClick = () => {
        if (disabled) return
        setCopied(toCopy)
        setTooltipOpen(true)
    }

    useIsomorphicLayoutEffect(() => {
        setContainer(portalContainerRef?.current ?? undefined)
    }, [portalContainerRef])

    return (
        <Tooltip open={isTooltipOpen} onOpenChange={setTooltipOpen}>
            <TooltipTrigger>
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
            </TooltipTrigger>
            <TooltipContent container={container}>
                <p>{isCopied ? "Copied" : "Copy"}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export default CopyButton
