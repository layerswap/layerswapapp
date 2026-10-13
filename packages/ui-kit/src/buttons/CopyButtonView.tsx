import { Tooltip, TooltipTrigger, TooltipContent } from "../shadcn/tooltip";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";
import CopyIcon from "../icons/CopyIcon";

export function CopyButtonView({
    className,
    children,
    iconSize,
    iconClassName,
    disabled = false,
    isCopied = false,
    isTooltipOpen,
    setTooltipOpen,
    container,
    handleCopyClick,
}: {
    className?: string;
    children?: ReactNode;
    iconSize?: number;
    iconClassName?: string;
    disabled?: boolean;
    isCopied?: boolean;
    isTooltipOpen?: boolean;
    setTooltipOpen?: (open: boolean) => void;
    container?: HTMLElement | null;
    handleCopyClick?: () => void;
}) {
    return (
        <Tooltip
            open={isTooltipOpen}
            onOpenChange={setTooltipOpen}
        >
            <TooltipTrigger>
                <div
                    className={clsx(
                        className,
                        "flex items-center gap-1",
                        "cursor-pointer",
                        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
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
    );
}
