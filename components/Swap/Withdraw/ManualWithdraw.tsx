import AddressIcon from '@/components/AddressIcon'
import CopyButton from '@/components/buttons/copyButton'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import QRIcon from '@/components/icons/QRIcon'
import shortenAddress from '@/components/utils/ShortenAddress'
import useCopyClipboard from '@/hooks/useCopyClipboard'
import useWallet from '@/hooks/useWallet'
import { DepositAction, Refuel, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import React, { useEffect, useMemo } from 'react'
import { FC, ReactNode, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "../../shadcn/popover";
import useExchangeNetworks from '@/hooks/useExchangeNetworks'
import { ChevronDown } from 'lucide-react'
import { CommandItem, CommandList, CommandWrapper } from '@/components/shadcn/command'
import { Network, NetworkRoute, Token } from '@/Models/Network'
import { useQueryState } from '@/context/query'
import { useSwapDataUpdate } from '@/context/swap'
import { SwapFormValues } from '@/components/DTOs/SwapFormValues'
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee'
import { useAsyncModal } from '@/context/asyncModal'
import QuoteUpdated from './QuoteUpdated'

interface Props {
    swapBasicData: SwapBasicData;
    quote: SwapQuote | undefined;
    depositActions: DepositAction[] | undefined;
    refuel?: Refuel | undefined
}

const ManualWithdraw: FC<Props> = ({ swapBasicData, quote, depositActions, refuel }) => {
    const { wallets } = useWallet();
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const [pendingSwapValues, setPendingSwapValues] = useState<SwapFormValues | null>(null);
    
    const [loading, setLoading] = useState(false)
    const { getConfirmation } = useAsyncModal();

    const [showQR, setShowQR] = useState(false)
    const destinationLogo = swapBasicData?.destination_network?.logo
    const [copied, copy] = useCopyClipboard()
    const query = useQueryState()

    const depositAddress = depositActions?.find(da => true)?.to_address;

    const WalletIcon = wallets.find(wallet => wallet.address.toLowerCase() == swapBasicData?.destination_address?.toLowerCase())?.icon;

    const handleCopy = () => {
        if (depositAddress) {
            copy(depositAddress)
        }
    }

    const quoteArgs = useMemo(() => {
        return pendingSwapValues ? transformFormValuesToQuoteArgs(pendingSwapValues) : null;
    }, [pendingSwapValues]);

    const { minAllowedAmount, maxAllowedAmount } = useQuoteData(quoteArgs || undefined);

    const handleClick = async (network: Network, token: Token) => {
        const swapValues: SwapFormValues = {
            amount: swapBasicData?.requested_amount?.toString(),
            from: network as NetworkRoute,
            to: swapBasicData?.destination_network as NetworkRoute,
            fromAsset: token,
            toAsset: swapBasicData?.destination_token,
            refuel: !!refuel,
            destination_address: swapBasicData?.destination_address,
            fromExchange: swapBasicData?.source_exchange,
            currencyGroup: swapBasicData?.source_token,
            depositMethod: 'deposit_address',
        };

        setPendingSwapValues(swapValues)
        const requestedAmount = parseFloat(swapValues.amount || "0");

        if ((minAllowedAmount && requestedAmount < minAllowedAmount) || (maxAllowedAmount && requestedAmount > maxAllowedAmount)) {
            const isBelowMin = minAllowedAmount !== undefined && requestedAmount < minAllowedAmount;
            const isAboveMax = maxAllowedAmount !== undefined && requestedAmount > maxAllowedAmount;

            const newAmount = isBelowMin ? minAllowedAmount : isAboveMax ? maxAllowedAmount : requestedAmount;

            const confirmed = await getConfirmation({
                content: (
                    <QuoteUpdated
                        minAllowedAmount={minAllowedAmount}
                        maxAllowedAmount={maxAllowedAmount}
                        originalAmount={requestedAmount}
                        updatedReceiveAmount={quote?.receive_amount}
                    />
                ),
                submitText: "Continue with new quote",
            });

            if (!confirmed) return;

            swapValues.amount = newAmount.toString();
        }

        try {
            setSwapId(undefined);
            setLoading(true);

            window.safary?.track?.({
                eventName: 'click',
                eventType: 'send_from_wallet',
            });

            const swapData = await createSwap(swapValues, query);
            const swapId = swapData?.swap?.id;
            if (!swapId) throw new Error('Swap ID is undefined');

            setSwapId(swapId);
        } catch (e) {
            console.error('Swap creation error:', e);
        } finally {
            setLoading(false);
        }
    };


    const { networks: withdrawalNetworks, isLoading: exchangeSourceNetworksLoading } = useExchangeNetworks({
        currencyGroup: swapBasicData?.source_token?.symbol,
        fromExchange: swapBasicData?.source_exchange?.name,
        to: swapBasicData?.destination_network?.name,
        toAsset: swapBasicData?.destination_token?.symbol
    });


    const qrCode = (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-full mr-3 top-0 z-50 bg-secondary-300 p-2 rounded-xl"
        >
            <div className="bg-white p-2 rounded-xl shadow-lg">
                <QRCodeSVG
                    className="rounded-lg"
                    value={depositAddress || ''}
                    includeMargin={true}
                    size={160}
                    level="H"
                />
            </div>
        </motion.div>
    )

    const requestAmount = (
        <span className='inline-flex items-center gap-1 px-1.5 mx-1 bg-secondary-300 rounded-lg'>
            {swapBasicData?.requested_amount} {swapBasicData?.source_token?.symbol}
            <CopyButton toCopy={swapBasicData?.requested_amount} iconClassName='text-secondary-text' />
        </span>
    )

    const destinationNetwork = (
        <span className='flex items-center gap-1'>
            {destinationLogo && <ImageWithFallback
                src={destinationLogo!}
                alt="Project Logo"
                height="16"
                width="16"
                loading="eager"
                className="rounded-md object-contain"
            />}
            {swapBasicData?.destination_network?.display_name}
        </span>
    )

    const sourceNetworkPopover = (
        <Popover>
            <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-1.5 mx-1 bg-secondary-300 rounded-lg">
                    <ImageWithFallback
                        src={swapBasicData?.source_network?.logo}
                        alt="Project Logo"
                        height="16"
                        width="16"
                        loading="eager"
                        className="rounded-sm object-contain"
                    />
                    <span>{swapBasicData?.source_network?.display_name}</span>
                    <span className="pointer-events-none text-shadow-primary-text-muted">
                        <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent side='top' className="bg-secondary-300! space-y-1 p-1! rounded-lg!">
                <CommandWrapper>
                    <CommandList>
                        {withdrawalNetworks?.map((item, index) => {
                            return (
                                <CommandItem
                                    className='hover:bg-secondary-100 rounded-md p-1! cursor-pointer'
                                    value={item.network.name}
                                    key={item.network.name}
                                    onSelect={() => handleClick(item.network, item.token)}
                                >
                                    <div className={`flex items-center justify-between w-full overflow-hidden`}>
                                        <div className={`gap-2 relative flex items-center w-full space-y-1`}>
                                            <div className={`h-6 w-6 shrink-0 mb-0!`}>
                                                {item.network.logo && (
                                                    <ImageWithFallback
                                                        src={item.network.logo}
                                                        alt="Project Logo"
                                                        height="24"
                                                        width="24"
                                                        loading="eager"
                                                        className="rounded-md object-contain"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex justify-between w-full items-center">
                                                <span className="flex items-center pb-0.5 text-sm font-medium text-primary-text pr-20">
                                                    {item.network.display_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandList>
                </CommandWrapper>
            </PopoverContent>
        </Popover>
    )

    return (
        <div className="rounded-lg space-y-4 text-white">
            <div className="space-y-3">
                <Step
                    number={1}
                    label={
                        <div className="flex items-center justify-between gap-2 relative">
                            <span>Copy the deposit address</span>
                            <div className="relative">
                                <QRIcon
                                    className="bg-secondary-300 p-1 rounded-lg cursor-pointer hover:opacity-80"
                                    onClick={() => setShowQR(!showQR)}
                                />
                                {showQR && qrCode}
                            </div>
                        </div>
                    }
                    value={
                        <span className="cursor-pointer hover:underline" >
                            {shortenAddress(depositAddress || '')}
                        </span>
                    }
                />
                <Step
                    number={2}
                    label={
                        <span>
                            <span className='inline-flex items-center gap-1'>
                                <span>Send</span>
                                {requestAmount}
                            </span>
                            <span>via</span>
                            {swapBasicData?.source_exchange ? (
                                <span className="inline-flex items-center align-bottom">
                                    {sourceNetworkPopover}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 mx-1 h-6 align-bottom">
                                    <ImageWithFallback
                                        src={swapBasicData?.source_network?.logo}
                                        alt="Project Logo"
                                        height="16"
                                        width="16"
                                        loading="eager"
                                        className="rounded-sm object-contain"
                                    />
                                    <span>{swapBasicData?.source_network?.display_name}</span>
                                </span>
                            )}
                            <span>using the deposit address</span>
                        </span>
                    }
                />
                <Step
                    number={3}
                    label={
                        <span className='flex items-center gap-1'>
                            Receive {quote?.receive_amount} {swapBasicData?.destination_token?.symbol} at {destinationNetwork}
                        </span>
                    }
                    value={
                        <span className="cursor-pointer hover:underline flex items-center gap-2">
                            {WalletIcon ?
                                <WalletIcon className="w-4 h-4 p-0.5 bg-white rounded-sm" />
                                :
                                <AddressIcon className="h-4 w-4" address={swapBasicData.destination_address} size={36} rounded='4px' />

                            }
                            {shortenAddress(swapBasicData.destination_address)}
                        </span>
                    }
                />
            </div>
            <button onClick={handleCopy} className="bg-primary hover:bg-primary/90 w-full py-2 rounded-md font-semibold">
                Copy deposit address
            </button>
        </div>
    )
}

const Step = ({ number, label, value }: { number: number, label: ReactNode, value?: ReactNode }) => (
    <div className="flex items-start space-x-3 bg-secondary-500 p-3 rounded-lg">
        <div className="w-6 h-6 rounded-md bg-secondary-400 text-primary-text flex items-center justify-center text-base font-normal leading-6">
            {number}
        </div>
        <div className="flex-1">
            <div className="font-normal text-base leading-6">{label}</div>
            <div className="text-sm text-secondary-text">{value}</div>
        </div>
    </div>
)

export default ManualWithdraw
