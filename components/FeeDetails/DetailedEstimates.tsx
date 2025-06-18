import { FC, SVGProps } from "react";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import AverageCompletionTime from "../Common/AverageCompletionTime";
import { Tooltip, TooltipContent, TooltipTrigger, } from "../../components/shadcn/tooltip"
import { truncateDecimals } from "../utils/RoundDecimals";
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import GasIcon from '../icons/GasIcon';
import Clock from '../icons/Clock';
import FeeIcon from "../icons/FeeIcon";
import { Quote } from '@/lib/apiClients/layerSwapApiClient';

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({ quote, isQuoteLoading }) => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency } = values;
    const { provider } = useWallet(values.from, 'withdrawal')
    const wallet = provider?.activeWallet
    const { gas, isGasLoading } = useSWRGas(wallet?.address, values.from, values.fromCurrency)

    const displayLsFee = quote?.total_fee !== undefined ? truncateDecimals(quote.total_fee, fromCurrency?.decimals) : undefined
    const currencyName = fromCurrency?.symbol || " "
    const lsFeeAmountInUsd = quote?.total_fee_in_usd
    const gasFeeInUsd = (quote?.source_network?.token && gas) ? gas * quote?.source_network?.token?.price_in_usd : null;
    const displayLsFeeInUsd = lsFeeAmountInUsd ? (lsFeeAmountInUsd < 0.01 ? '<$0.01' : `$${lsFeeAmountInUsd?.toFixed(2)}`) : null
    const displayGasFeeInUsd = gasFeeInUsd ? (gasFeeInUsd < 0.01 ? '<$0.01' : `$${gasFeeInUsd?.toFixed(2)}`) : null

    return <div className="flex flex-col w-full gap-2 divide-y divide-secondary-300">
        {
            detailsElements.map((item) => {
                const showElement = item.showCondition ? item.showCondition(gas) : true
                const Icon = item.icon
                if (!showElement) return null

                return (
                    <div className="flex items-center w-full justify-between gap-1 pb-2 px-1">
                        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                            <div className="w-5">
                                <Icon className="place-self-center" />
                            </div>
                            <label>
                                {item.name}
                            </label>
                        </div>
                        <div className="text-right text-primary-text">
                            {item.content({ gas, currencyName, displayGasFeeInUsd, quote, displayLsFee, displayLsFeeInUsd, isGasLoading, isQuoteLoading })}
                        </div>
                    </div>
                )
            })
        }
    </div>
}

type DetailedEstimatesProps = {
    quote: Quote["quote"] | undefined
    isQuoteLoading: boolean
}

type DetailsContentProps = {
    gas: number | undefined
    currencyName: string
    displayGasFeeInUsd: string | null
    displayLsFee: string | undefined
    displayLsFeeInUsd: string | null
    quote: Quote["quote"] | undefined
    isQuoteLoading: boolean
    isGasLoading: boolean
}

type DetailedElement = {
    name: string
    icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
    content: (props: DetailsContentProps) => JSX.Element
    showCondition?: (gas: number | undefined) => boolean
}

const detailsElements: DetailedElement[] = [
    {
        name: 'Gas Fee',
        icon: GasIcon,
        showCondition: (gas) => { return gas !== undefined },
        content: ({ gas, currencyName, displayGasFeeInUsd, isGasLoading }) => {
            return isGasLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />
            ) : <div>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                        {gas !== undefined && (
                            <span className="text-sm ml-1 font-small">
                                {displayGasFeeInUsd}
                            </span>
                        )}
                    </TooltipTrigger>
                    <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primart-text">
                        <span>{gas || '-'} </span>
                        <span>{gas ? currencyName : ''}</span>
                    </TooltipContent>
                </Tooltip>
            </div>
        }
    },
    {
        name: 'Layerswap Fee',
        icon: FeeIcon,
        content: ({ displayLsFeeInUsd, displayLsFee, currencyName, isQuoteLoading }) => {
            return isQuoteLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />
            ) : <div>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                        {displayLsFeeInUsd !== undefined && (
                            <span className="text-sm ml-1 font-small">
                                {displayLsFeeInUsd}
                            </span>
                        )}
                    </TooltipTrigger>
                    <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primart-text">
                        <span>{displayLsFee || '-'} </span>
                        <span>{displayLsFee ? currencyName : ''}</span>
                    </TooltipContent>
                </Tooltip>
            </div>
        }
    },
    {
        name: 'Estimated time',
        icon: Clock,
        content: ({ quote }) => {
            return quote && quote.avg_completion_time !== '00:00:00' ?
                <AverageCompletionTime avgCompletionTime={quote.avg_completion_time} />
                : (
                    <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                )
        }
    },
]
