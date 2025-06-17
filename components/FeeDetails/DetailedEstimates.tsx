import { FC } from "react";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useQuote } from "../../context/feeContext";
import AverageCompletionTime from "../Common/AverageCompletionTime";
import { Tooltip, TooltipContent, TooltipTrigger, } from "../../components/shadcn/tooltip"

export const DetailedEstimates: FC = () => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency } = values;
    const { quote: fee, isQuoteLoading: isFeeLoading } = useQuote()
    const { quote } = fee || {}


    const parsedGasFee = quote?.blockchain_fee && parseFloat(Number(quote.blockchain_fee).toFixed(fromCurrency?.precision))
    const parsedLsFee = quote?.service_fee && parseFloat(Number(quote.service_fee).toFixed(fromCurrency?.precision))
    const currencyName = fromCurrency?.symbol || " "
    const lsFeeAmountInUsd = (quote?.service_fee && quote.source_token?.price_in_usd) ? quote.service_fee * quote.source_token?.price_in_usd : null
    const gasFeeAmountInUsd = (quote?.total_fee_in_usd && lsFeeAmountInUsd) ? quote?.total_fee_in_usd - lsFeeAmountInUsd : null
    const displayGasFee = parsedGasFee?.toFixed(fromCurrency?.precision)
    const displayLsFee = parsedLsFee?.toFixed(fromCurrency?.precision)
    const displayGasFeeInUsd = gasFeeAmountInUsd ? (gasFeeAmountInUsd < 0.01 ? '<$0.01' : `$${gasFeeAmountInUsd?.toFixed(2)}`) : null
    const displayLsFeeInUsd = lsFeeAmountInUsd ? (lsFeeAmountInUsd < 0.01 ? '<$0.01' : `$${lsFeeAmountInUsd?.toFixed(2)}`) : null

    return <div className="flex flex-col w-full gap-2 divide-y divide-secondary-300">
        <div className="flex justify-between w-full items-center p-1">
            <div className="flex items-baseline w-full justify-between gap-1">
                <label className="inline-flex items-center text-left text-primary-buttonTextColor">
                    Gas Fee
                </label>
                <div className="text-right text-secondary-text ">
                    {isFeeLoading ? (
                        <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                    ) : (
                        <div>

                            <Tooltip delayDuration={100}>
                                <TooltipTrigger>
                                    {displayGasFeeInUsd !== undefined && (
                                        <span className="text-sm ml-1 font-medium">
                                            {displayGasFeeInUsd}
                                        </span>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent className="!bg-secondary-500 !border-secondary-300">
                                    <span>{displayGasFee || '-'} </span>
                                    <span>{parsedGasFee ? currencyName : ''}</span>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div className="flex justify-between w-full items-center p-1">
            <div className="flex items-baseline w-full justify-between gap-1">
                <label className="inline-flex items-center text-left text-primary-buttonTextColor">
                    Layerswap Fee
                </label>
                <div className="text-right text-secondary-text ">
                    {isFeeLoading ? (
                        <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                    ) : (
                        <div>
                            <Tooltip delayDuration={100}>
                                <TooltipTrigger>
                                    {displayLsFeeInUsd !== undefined && (
                                        <span className="text-sm ml-1 font-medium">
                                            {displayLsFeeInUsd}
                                        </span>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent className="!bg-secondary-500 !border-secondary-300">
                                    <span>{displayLsFee || '-'} </span>
                                    <span>{parsedLsFee ? currencyName : ''}</span>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {
            fee && fee.quote.avg_completion_time !== '00:00:00' ?
                <div className="flex justify-between w-full items-center p-1">
                    <div className="flex items-baseline w-full justify-between gap-1">
                        <label className="inline-flex items-center text-left text-primary-buttonTextColor">
                            Estimated time
                        </label>
                        <div className="text-right text-secondary-text">
                            <AverageCompletionTime avgCompletionTime={fee.quote.avg_completion_time} />
                        </div>
                    </div>
                </div>
                :
                <></>
        }
    </div>
}