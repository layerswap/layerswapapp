import Content from '@/components/Widget/Content';
import {
    RecipientAddressView,
    type RecipientPresentation,
} from '@/components/Common/RecipientAddressView';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { Address } from '@/lib/address/Address';
import type {
    SwapBasicData,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import { ImageWithFallback } from '@layerswap/ui-kit/components';
import type { ReactNode } from 'react';
export function ManualInstructionsView({
    swapBasicData,
    quote,
    loading,
    depositAddress,
    sourceSelector,
    destinationAddress,
    recipient,
    qr,
    amountCopy,
    addressCopy,
    quoteDetails,
}: {
    swapBasicData: SwapBasicData;
    quote?: SwapQuote;
    loading?: boolean;
    depositAddress?: string;
    sourceSelector?: ReactNode;
    destinationAddress?: ReactNode;
    recipient?: RecipientPresentation;
    qr?: ReactNode;
    amountCopy?: ReactNode;
    addressCopy?: ReactNode;
    quoteDetails?: ReactNode;
}) {
    const destinationLogo = swapBasicData.destination_network.logo;
    const requestAmount = (
        <span className="inline-flex items-center gap-1 px-1.5 bg-secondary-300 rounded-lg whitespace-nowrap">
            <span>
                {truncateDecimals(
                    Number(swapBasicData?.requested_amount),
                    swapBasicData?.source_token?.precision,
                )}
            </span>{' '}
            <span>{swapBasicData?.source_token?.asset}</span>
            {amountCopy}
        </span>
    );

    const destinationNetwork = (
        <span className="inline-flex items-center gap-1 min-w-0">
            {destinationLogo && (
                <ImageWithFallback
                    src={destinationLogo!}
                    alt="Project Logo"
                    height="16"
                    width="16"
                    loading="eager"
                    className="rounded-md object-contain shrink-0"
                />
            )}
            <span className="break-words min-w-0">
                {swapBasicData?.destination_network?.display_name}
            </span>
        </span>
    );

    return (
        <>
            <Content>
                <div className="flex flex-col flex-1 h-full min-h-0 w-full space-y-3">
                    {loading ? (
                        <>
                            <SkeletonStep number={1} />
                            <SkeletonStep number={2} />
                            <SkeletonStep number={3} />
                        </>
                    ) : (
                        <>
                            <Step
                                number={1}
                                label={
                                    <div className="flex items-center justify-between gap-2 relative">
                                        <span>Copy the deposit address</span>
                                        <div className="relative">{qr}</div>
                                    </div>
                                }
                                value={
                                    <span className="cursor-pointer hover:underline min-h-5 block">
                                        {depositAddress ? (
                                            <span className="flex items-center gap-1">
                                                {new Address(
                                                    depositAddress,
                                                    swapBasicData?.source_network,
                                                ).toShortString()}
                                                {addressCopy}
                                            </span>
                                        ) : (
                                            <span className="inline-block w-28 bg-secondary-400 h-5 rounded animate-pulse"></span>
                                        )}
                                    </span>
                                }
                            />
                            <Step
                                number={2}
                                label={
                                    <span className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
                                        <span>Send</span>
                                        {requestAmount}
                                        <span>via</span>
                                        {swapBasicData?.source_exchange ? (
                                            sourceSelector
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-1.5 bg-secondary-300 rounded-lg whitespace-nowrap">
                                                <ImageWithFallback
                                                    src={
                                                        swapBasicData
                                                            ?.source_network
                                                            ?.logo
                                                    }
                                                    alt="Project Logo"
                                                    height="16"
                                                    width="16"
                                                    loading="eager"
                                                    className="rounded-sm object-contain shrink-0"
                                                />
                                                <span>
                                                    {
                                                        swapBasicData
                                                            ?.source_network
                                                            ?.display_name
                                                    }
                                                </span>
                                            </span>
                                        )}
                                        <span>to the deposit address</span>
                                    </span>
                                }
                            />
                            <Step
                                number={3}
                                label={
                                    <span className="flex items-center gap-1">
                                        <span>Receive</span>{' '}
                                        <span>
                                            {truncateDecimals(
                                                quote?.receive_amount ?? 0,
                                                swapBasicData?.destination_token
                                                    ?.precision,
                                            )}
                                        </span>{' '}
                                        <span>
                                            {
                                                swapBasicData?.destination_token
                                                    ?.asset
                                            }
                                        </span>{' '}
                                        <span>at</span>{' '}
                                        <span>{destinationNetwork}</span>
                                    </span>
                                }
                                value={
                                    <RecipientAddressView
                                        address={
                                            swapBasicData.destination_address
                                        }
                                        network={
                                            swapBasicData.destination_network
                                        }
                                        variant="manual"
                                        {...recipient}
                                    >
                                        {destinationAddress}
                                    </RecipientAddressView>
                                }
                            />
                            {quoteDetails}
                        </>
                    )}
                </div>
            </Content>
        </>
    );
}

const Step = ({
    number,
    label,
    value,
}: {
    number: number;
    label: ReactNode;
    value?: ReactNode;
}) => (
    <div className="flex items-start space-x-3 bg-secondary-500 p-3 rounded-xl">
        <div className="w-6 h-6 rounded-md bg-secondary-400 text-primary-text flex items-center justify-center text-base font-normal leading-6">
            {number}
        </div>
        <div className="flex-1 min-w-0">
            <div className="font-normal text-base leading-6">{label}</div>
            {value != null && (
                <div className="text-sm text-secondary-text">{value}</div>
            )}
        </div>
    </div>
);

const SkeletonStep = ({ number }: { number: number }) => (
    <div className="flex items-start space-x-3 bg-secondary-500 p-3 rounded-lg animate-pulse">
        <div className="w-6 h-6 rounded-md bg-secondary-400 text-primary-text flex items-center justify-center text-base font-normal leading-6">
            {number}
        </div>
        <div className="flex-1 space-y-3">
            <div className="h-5 bg-secondary-300 rounded w-3/4"></div>
            <div className="h-4 bg-secondary-300 rounded w-1/2"></div>
        </div>
    </div>
);
