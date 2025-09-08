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
import React, { useMemo } from 'react'
import { FC, ReactNode, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import useExchangeNetworks from '@/hooks/useExchangeNetworks'
import { ChevronDown } from 'lucide-react'
import { CommandItem, CommandList, CommandWrapper } from '@/components/shadcn/command'
import { Network, NetworkRoute, Token } from '@/Models/Network'
import { useQueryState } from '@/context/query'
import { useSwapDataUpdate } from '@/context/swap'
import { SwapFormValues } from '@/components/DTOs/SwapFormValues'
import { useAsyncModal } from '@/context/asyncModal'
import { handleLimitsUpdate } from './QuoteUpdate'
import SubmitButton from '@/components/buttons/submitButton'

interface Props {
    swapBasicData: SwapBasicData;
    quote: SwapQuote | undefined;
    depositActions: DepositAction[] | undefined;
    refuel?: Refuel | undefined
}

const ManualWithdraw: FC<Props> = ({ swapBasicData, quote, depositActions, refuel }) => {
    const { wallets } = useWallet();
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [newNetwork, setNewNetwork] = useState<Network | null>(null);

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
            depositMethod: 'deposit_address',
        };

        try {
            setLoading(true);

            await handleLimitsUpdate({
                swapValues,
                network,
                token,
                getConfirmation
            })

            const swapData = await createSwap(swapValues, query);
            setNewNetwork(network);
            const swapId = swapData?.swap?.id;
            if (!swapId) throw new Error('Swap ID is undefined');

            setSwapId(swapId);
            setIsPopoverOpen(false);
        } catch (e) {
            console.error('Swap creation error:', e);
        } finally {
            setLoading(false);
        }
    };

    const exchangeNetworkParams = useMemo(() => ({
        fromExchange: swapBasicData?.source_exchange?.name,
        to: swapBasicData?.destination_network?.name,
        toAsset: swapBasicData?.destination_token?.symbol
    }), [swapBasicData]);

    const { networks: withdrawalNetworks, isLoading: exchangeSourceNetworksLoading } = useExchangeNetworks(exchangeNetworkParams);

    const requestAmount = (
        <span className='inline-flex items-center gap-1 px-1.5 mx-1 bg-secondary-300 rounded-lg'>
            <span>{swapBasicData?.requested_amount}</span> <span>{swapBasicData?.source_token?.symbol}</span>
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
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-1.5 mx-1 bg-secondary-300 rounded-lg">
                    <ImageWithFallback
                        src={newNetwork?.logo || swapBasicData?.source_network?.logo}
                        alt="Project Logo"
                        height="16"
                        width="16"
                        loading="eager"
                        className="rounded-sm object-contain"
                    />
                    <span>{newNetwork?.display_name || swapBasicData?.source_network?.display_name}</span>
                    <span className="pointer-events-none text-shadow-primary-text-muted">
                        <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent side='top' className="bg-secondary-300! space-y-1 p-1! rounded-lg!">
                <CommandWrapper>
                    <CommandList>
                        {withdrawalNetworks?.map((item) => {
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
        <div className="rounded-lg space-y-3 text-white">
            <>
                {(loading || exchangeSourceNetworksLoading) ? (
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
                                    <div className="relative">
                                        <Popover open={showQR} onOpenChange={setShowQR}>
                                            <PopoverTrigger asChild>
                                                <div className="relative">
                                                    <QRIcon
                                                        className="bg-secondary-300 p-1 rounded-lg cursor-pointer hover:opacity-80"
                                                    />
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                side="left"
                                                align="start"
                                                className="bg-secondary-300 p-2 rounded-xl z-50"
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
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            }
                            value={
                                <span className="cursor-pointer hover:underline min-h-[20px] block">
                                    {depositAddress ? shortenAddress(depositAddress) : <span className="inline-block w-28 bg-secondary-400 h-[20px] rounded animate-pulse"></span>}
                                </span>
                            }
                        />
                        <Step
                            number={2}
                            label={
                                <span>
                                    <span className='inline-flex items-center'>
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
                                    <span>Receive</span> <span>{quote?.receive_amount}</span> <span>{swapBasicData?.destination_token?.symbol}</span> <span>at</span> <span>{destinationNetwork}</span>
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
                    </>
                )}
            </>
            <SubmitButton onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy deposit address'}
            </SubmitButton>
        </div>
    )
}

const Step = ({ number, label, value }: { number: number, label: ReactNode, value?: ReactNode }) => (
    <div className="flex items-start space-x-3 bg-secondary-500 p-3 rounded-xl">
        <div className="w-6 h-6 rounded-md bg-secondary-400 text-primary-text flex items-center justify-center text-base font-normal leading-6">
            {number}
        </div>
        <div className="flex-1">
            <div className="font-normal text-base leading-6">{label}</div>
            <div className="text-sm text-secondary-text">{value}</div>
        </div>
    </div>
)

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
)

export default ManualWithdraw