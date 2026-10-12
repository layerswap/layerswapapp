import AverageCompletionTime from '@/components/Common/AverageCompletionTime';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/shadcn/tooltip';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper';
import type {
    QuoteReward,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import type { NetworkRouteToken } from '@layerswap/widget-types';
import type { SwapValues } from '../../Form/FeeDetails';
import { RateElement } from '../../Form/FeeDetails/Rate';
type RowWrapperProps = {
    children: React.ReactNode;
    title: string;
};

export const RowWrapper = ({ children, title }: RowWrapperProps) => {
    return (
        <div className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
            <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                <label>{title}</label>
            </div>
            <div className="text-right text-primary-text">{children}</div>
        </div>
    );
};

export const Fees = ({
    quote,
    values,
}: {
    quote: SwapQuote | undefined;
    values: SwapValues;
}) => {
    const feeDiscount = quote?.fee_discount;
    const hasDiscount = feeDiscount != null && feeDiscount > 0;

    // total_fee is the original fee, discounted fee is total_fee - fee_discount
    const originalFee = quote?.total_fee;
    const discountedFee =
        hasDiscount && originalFee !== undefined
            ? originalFee - feeDiscount
            : originalFee;

    // Calculate fees in USD
    const sourceTokenPriceInUsd = resolveTokenUsdPrice(values.fromAsset, quote);
    const originalFeeInUsd =
        originalFee !== undefined && sourceTokenPriceInUsd != null
            ? originalFee * sourceTokenPriceInUsd
            : null;

    // Calculate discounted fee in USD
    const discountedFeeInUsd =
        discountedFee !== undefined && sourceTokenPriceInUsd != null
            ? discountedFee * sourceTokenPriceInUsd
            : null;

    const displayOriginalFeeInUsd =
        originalFeeInUsd != null
            ? originalFeeInUsd < 0.01
                ? '<$0.01'
                : `$${originalFeeInUsd.toFixed(2)}`
            : null;

    const isFree = discountedFee !== undefined && discountedFee === 0;
    const displayLsFeeInUsd = isFree
        ? 'Free'
        : discountedFeeInUsd != null
          ? discountedFeeInUsd < 0.01
              ? '<$0.01'
              : `$${discountedFeeInUsd.toFixed(2)}`
          : null;

    const currencyName = values.fromAsset?.asset || '';
    const displayLsFee =
        discountedFee !== undefined
            ? truncateDecimals(discountedFee, values.fromAsset?.decimals)
            : undefined;

    return (
        <RowWrapper title="Fees">
            <Tooltip>
                <TooltipTrigger asChild>
                    {displayLsFeeInUsd !== undefined && (
                        <div className="flex items-center gap-2 text-sm ml-1 font-small">
                            {hasDiscount && displayOriginalFeeInUsd && (
                                <span className="line-through text-primary-text-tertiary">
                                    {displayOriginalFeeInUsd}
                                </span>
                            )}
                            <span
                                className={
                                    hasDiscount || isFree
                                        ? 'text-primary-text'
                                        : ''
                                }
                            >
                                {displayLsFeeInUsd}
                            </span>
                        </div>
                    )}
                </TooltipTrigger>
                <TooltipContent className="bg-secondary-300! border-secondary-300! text-primart-text!">
                    <span>{displayLsFee || '-'} </span>
                    <span>{displayLsFee ? currencyName : ''}</span>
                </TooltipContent>
            </Tooltip>
        </RowWrapper>
    );
};
export const Estimates = ({ quote }: { quote: SwapQuote | undefined }) => {
    return (
        <RowWrapper title="Est. time">
            <AverageCompletionTime
                avgCompletionTime={quote?.avg_completion_time}
            />
        </RowWrapper>
    );
};

export const Reward = ({ reward }: { reward: QuoteReward }) => {
    return (
        <RowWrapper title="Reward">
            <Tooltip>
                <TooltipTrigger asChild>
                    {reward?.amount_in_usd !== undefined && (
                        <span className="text-sm ml-1 font-small">
                            ${reward.amount_in_usd.toFixed(2)}
                        </span>
                    )}
                </TooltipTrigger>
                <TooltipContent className="bg-secondary-300! border-secondary-300! text-primart-text!">
                    <span>{reward?.amount || '-'} </span>
                    <span>{reward?.amount ? reward.token.asset : ''}</span>
                </TooltipContent>
            </Tooltip>
        </RowWrapper>
    );
};
type RateProps = {
    fromAsset?: NetworkRouteToken;
    toAsset?: NetworkRouteToken;
    rate?: number;
};
export const Rate = ({ fromAsset, toAsset, rate }: RateProps) => {
    if (!fromAsset || !toAsset || !rate) {
        return null;
    }
    return (
        <RowWrapper title="Rate">
            <RateElement fromAsset={fromAsset} toAsset={toAsset} rate={rate} />
        </RowWrapper>
    );
};
