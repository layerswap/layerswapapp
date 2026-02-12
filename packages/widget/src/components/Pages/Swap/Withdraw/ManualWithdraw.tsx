import AddressIcon from '@/components/Common/AddressIcon'
import CopyButton from '@/components/Buttons/copyButton'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import QRIcon from '@/components/Icons/QRIcon'
import useCopyClipboard from '@/hooks/useCopyClipboard'
import useWallet from '@/hooks/useWallet'
import { DepositAction, Refuel, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo } from 'react'
import { FC, ReactNode, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import useExchangeNetworks from '@/hooks/useExchangeNetworks'
import { ChevronDown } from 'lucide-react'
import { CommandItem, CommandList, CommandWrapper } from '@/components/shadcn/command'
import { Network, NetworkRoute, Token } from '@/Models/Network'
import { useInitialSettings } from '@/context/settings'
import { useSwapDataUpdate } from '@/context/swap'
import { useAsyncModal } from '@/context/asyncModal'
import { handleLimitsUpdate } from './QuoteUpdate'
import SubmitButton from '@/components/Buttons/submitButton'
import { SwapFormValues } from '../Form/SwapFormValues'
import { Widget } from '@/components/Widget/Index'
import { truncateDecimals } from '@/components/utils/RoundDecimals'
import { Partner } from '@/Models/Partner'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'
import QuoteDetails from '../Form/FeeDetails'
import { Address } from "@/lib/address/Address";

interface Props {
    swapBasicData: SwapBasicData;
    depositActions: DepositAction[] | undefined;
    refuel?: Refuel | undefined
    partner?: Partner;
    type: 'widget' | 'contained',
    quote?: SwapQuote;
    isQuoteLoading?: boolean;
}

const ManualWithdraw: FC<Props> = ({ swapBasicData, depositActions, refuel, partner, type, quote, isQuoteLoading }) => {
    const { wallets } = useWallet();
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [selectedFrom, setSelectedFrom] = useState<{
        network: Network | null;
        token: Token | null;
    }>({
        network: swapBasicData?.source_network ?? null,
        token: swapBasicData?.source_token ?? null,
    });

    const [loading, setLoading] = useState(false)
    const { getConfirmation } = useAsyncModal();

    const [showQR, setShowQR] = useState(false)
    const destinationLogo = swapBasicData?.destination_network?.logo
    const [copied, copy] = useCopyClipboard()
    const initialSettings = useInitialSettings()
    const depositAddress = depositActions?.find(da => true)?.to_address;
    const { destination_address: destinationAddressFromQuery } = initialSettings

    const WalletIcon = wallets.find(wallet => wallet.address.toLowerCase() == swapBasicData?.destination_address?.toLowerCase())?.icon;
    const addressProviderIcon = destinationAddressFromQuery && partner?.is_wallet && Address.equals(destinationAddressFromQuery, swapBasicData?.destination_address!, swapBasicData?.destination_network || null) && partner?.logo

    const handleCopy = () => {
        if (depositAddress) {
            copy(depositAddress)
        }
    }

    const swapValues = useMemo<SwapFormValues>(() => {
        const fromNetwork = (selectedFrom.network ?? swapBasicData?.source_network) as NetworkRoute | undefined;
        const fromToken = selectedFrom.token ?? swapBasicData?.source_token;

        return {
            amount: swapBasicData?.requested_amount?.toString(),
            from: fromNetwork,
            to: swapBasicData?.destination_network as NetworkRoute,
            fromAsset: fromToken,
            toAsset: swapBasicData?.destination_token,
            refuel: !!refuel,
            destination_address: swapBasicData?.destination_address,
            fromExchange: swapBasicData?.source_exchange,
            depositMethod: 'deposit_address',
        };
    }, [selectedFrom.network, selectedFrom.token, swapBasicData, refuel]);

    const handleClick = async (network: Network, token: Token) => {
        const nextSwapValues: SwapFormValues = {
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
                swapValues: nextSwapValues,
                network,
                token,
                getConfirmation
            })

            const swapData = await createSwap(nextSwapValues, initialSettings);
            const swapId = swapData?.swap?.id;
            if (!swapId) throw new Error('Swap ID is undefined');

            setSwapId(swapId);
            setSelectedFrom({ network, token });
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
            <span>{truncateDecimals(Number(swapBasicData?.requested_amount), swapBasicData?.source_token?.precision)}</span> <span>{swapBasicData?.source_token?.symbol}</span>
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
                        src={selectedFrom.network?.logo ?? swapBasicData?.source_network?.logo}
                        alt="Project Logo"
                        height="16"
                        width="16"
                        loading="eager"
                        className="rounded-sm object-contain"
                    />
                    <span>{selectedFrom.network?.display_name ?? swapBasicData?.source_network?.display_name}</span>
                    <span className="pointer-events-none text-shadow-primary-text-tertiary">
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
        <>
            <Widget.Content>
                <div className='flex flex-col flex-1 h-full min-h-0 w-full space-y-3'>

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
                                                            className="bg-secondary-300 p-1 rounded-lg cursor-pointer hover:opacity-80 fill-primary-text text-primary-text"
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
                                    <span className="cursor-pointer hover:underline min-h-5 block">
                                        {depositAddress ? (
                                            <span className='flex items-center gap-1'>
                                                {new Address(depositAddress, swapBasicData?.source_network).toShortString()}
                                                <CopyButton toCopy={depositAddress || ''} className='flex' />
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
                                    <span>
                                        <span className='inline-flex items-center'>
                                            <span>Send</span>
                                            {requestAmount}
                                        </span>
                                        <span>via</span>
                                        {swapBasicData?.source_exchange ? (
                                            <span className="inline-flex items-center align-bottom max-sm:mt-1">
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
                                        <span>to the deposit address</span>
                                    </span>
                                }
                            />
                            <Step
                                number={3}
                                label={
                                    <span className='flex items-center gap-1'>
                                        <span>Receive</span> <span>{truncateDecimals(quote?.receive_amount ?? 0, swapBasicData?.destination_token?.precision)}</span> <span>{swapBasicData?.destination_token?.symbol}</span> <span>at</span> <span>{destinationNetwork}</span>
                                    </span>
                                }
                                value={
                                    <span className="cursor-pointer hover:underline flex items-center gap-1">
                                        {WalletIcon ? (
                                            <WalletIcon className="w-4 h-4 bg-secondary-700 rounded-sm" />
                                        ) : addressProviderIcon ? (
                                            <ImageWithFallback
                                                alt="Partner logo"
                                                className="h-4 w-4 rounded-md object-contain"
                                                src={partner.logo}
                                                width="36"
                                                height="36"
                                            />
                                        ) : (
                                            <AddressIcon className="h-4 w-4" address={new Address(swapBasicData.destination_address, swapBasicData?.destination_network).full} size={36} rounded="4px" />
                                        )}
                                        {
                                            ((swapBasicData?.destination_network && Address.isValid(swapBasicData?.destination_address, swapBasicData?.destination_network)) ?
                                                <div className="text-sm group/addressItem text-secondary-text">
                                                    <ExtendedAddress address={swapBasicData?.destination_address} network={swapBasicData?.destination_network} shouldShowChevron={false} />
                                                </div>
                                                :
                                                <p className="text-sm text-secondary-text">{new Address(swapBasicData?.destination_address, swapBasicData?.destination_network).toShortString()}</p>)
                                        }
                                    </span>
                                }
                            />
                            <QuoteDetails swapValues={swapValues} quote={quote} isQuoteLoading={isQuoteLoading} triggerClassnames='mt-0!' />
                        </>
                    )}
                </div>
            </Widget.Content>
            <Widget.Footer sticky={type == 'widget'}>
                <SubmitButton onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy deposit address'}
                </SubmitButton>
            </Widget.Footer>
        </>
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
