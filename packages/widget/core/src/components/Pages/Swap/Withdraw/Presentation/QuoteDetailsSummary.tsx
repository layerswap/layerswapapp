import AverageCompletionTime from '@/components/Common/AverageCompletionTime';
import NumFlowWithFallback from '@/components/Common/NumFlowWithFallback';
import Clock from '@/components/Icons/Clock';
import ExchangeGasIcon from '@/components/Icons/ExchangeGasIcon';
import GasIcon from '@/components/Icons/GasIcon';
import type { QuoteReward } from '@/lib/apiClients/layerSwapApiClient';
import clsx from 'clsx';
import { lazy, Suspense } from 'react';
import GaslessBadge from '../../Form/FeeDetails/GaslessBadge';
const CupIcon = lazy(() =>
    import('@/components/Icons/CupIcon').then((m) => ({ default: m.CupIcon })),
);
export function QuoteDetailsSummary({
    gasFeeInUsd,
    isGasless,
    isQuoteLoading,
    isExchange,
    averageCompletionTime,
    reward,
    showReward,
}: {
    gasFeeInUsd?: number | null;
    isGasless?: boolean;
    isQuoteLoading?: boolean;
    isExchange?: boolean;
    averageCompletionTime?: string;
    reward?: QuoteReward;
    showReward?: boolean;
}) {
    return (
        <div className="flex items-center gap-1 space-x-3">
            {gasFeeInUsd || isGasless ? (
                <>
                    {isGasless ? (
                        <GaslessBadge
                            className={clsx({
                                'animate-pulse-strong': isQuoteLoading,
                            })}
                        />
                    ) : (
                        <div
                            className={clsx('inline-flex items-center gap-1', {
                                'animate-pulse-strong': isQuoteLoading,
                            })}
                        >
                            <div className="p-0.5">
                                {!isExchange ? (
                                    <GasIcon className="h-4 w-4 text-secondary-text" />
                                ) : (
                                    <ExchangeGasIcon className="h-5 w-5 text-secondary-text" />
                                )}
                            </div>
                            <NumFlowWithFallback
                                className="text-primary-text text-sm leading-6"
                                value={
                                    gasFeeInUsd! < 0.01 ? '0.01' : gasFeeInUsd!
                                }
                                prefix={gasFeeInUsd! < 0.01 ? '<$' : '$'}
                            />
                        </div>
                    )}
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                </>
            ) : null}
            {averageCompletionTime ? (
                <>
                    <div
                        className={clsx(
                            'text-right inline-flex items-center gap-1 text-sm pt-px',
                            { 'animate-pulse-strong': isQuoteLoading },
                        )}
                    >
                        <div className="p-0.5">
                            <Clock className="h-4 w-4 text-secondary-text" />
                        </div>
                        <AverageCompletionTime
                            className="text-primary-text"
                            avgCompletionTime={averageCompletionTime}
                        />
                    </div>
                </>
            ) : null}
            {reward && showReward ? (
                <>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                    <div className="text-right text-primary-text inline-flex items-center gap-1">
                        <div className="p-0.5">
                            <Suspense fallback={null}>
                                <CupIcon alt="Reward" width={16} height={16} />
                            </Suspense>
                        </div>
                        <NumFlowWithFallback
                            value={
                                reward?.amount_in_usd < 0.01
                                    ? '0.01'
                                    : reward?.amount_in_usd
                            }
                            prefix={reward?.amount_in_usd < 0.01 ? '<$' : '$'}
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
}
