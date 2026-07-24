import InfoIcon from "@/components/Icons/InfoIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { RefreshCw } from "lucide-react";
import { ReactNode } from "react";

interface BalanceWarningTooltipProps {
    balance: string;
    title: string;
    description: ReactNode;
    onRefresh?: () => void;
}

const BalanceWarningTooltip = ({ balance, title, description, onRefresh }: BalanceWarningTooltipProps) => {
    return <Tooltip openOnClick>
        <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-warning-foreground justify-center group/balance-warn">
                {onRefresh ? (
                    <>
                        <InfoIcon className="w-3 h-3 group-hover/balance-warn:hidden" />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefresh();
                            }}
                            className="hidden group-hover/balance-warn:block"
                        >
                            <RefreshCw className="w-3 h-3 hover:animate-spin" />
                        </button>
                    </>
                ) : (
                    <InfoIcon className="w-3 h-3" />
                )}
                <p>{balance}</p>
            </div>
        </TooltipTrigger>
        <TooltipContent showArrow side="top" arrowClasses="bg-secondary-400! fill-secondary-400!" className="shadow-[0px_1px_3px_0px_rgba(0,0,0,0.5)]! bg-secondary-400! border-0! p-3! rounded-xl! max-w-[250px]">
            <div className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-warning-foreground shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                    <p className="text-sm text-primary-text font-medium">
                        {title}
                    </p>
                    <p className="text-xs text-secondary-text">
                        {description}
                    </p>
                </div>
            </div>
        </TooltipContent>
    </Tooltip>
}

export default BalanceWarningTooltip
