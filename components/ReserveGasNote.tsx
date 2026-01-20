import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import InfoIcon from "@/components/icons/InfoIcon";

const ReserveGasNote = ({ balance }: { balance: string }) => {
    return <Tooltip openOnClick>
        <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-warning-foreground justify-center">
                <InfoIcon className="w-3 h-3" />
                <p>{balance}</p>
            </div>
        </TooltipTrigger>
        <TooltipContent showArrow side="top" arrowClasses="fill-secondary-400 [filter:drop-shadow(0px_1px_3px_rgba(0,0,0,0.5))] translate-y-[-1px]" className="shadow-[0px_1px_3px_0px_rgba(0,0,0,0.5)]! bg-secondary-400! border-0! p-3! rounded-xl! max-w-[250px]">
            <div className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-warning-foreground shrink-0 mt-0.5" />

                <div className="flex flex-col gap-1">
                    <p className="text-sm text-primary-text font-medium">
                        <span>Insufficient balance for gas</span>
                    </p>
                    <p className="text-xs text-secondary-text">
                        <span>Your total balance must cover the transfer amount + gas fee. Tap Max to calculate the limit.</span>
                    </p>
                </div>
            </div>
        </TooltipContent>
    </Tooltip >
}

export default ReserveGasNote