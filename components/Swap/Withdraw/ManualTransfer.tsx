import { FC } from "react"
import { ArrowLeftRight } from "lucide-react"
import { useSwapDataState } from "../../../context/swap";
import KnownInternalNames from "../../../lib/knownIds";
import BackgroundField from "../../backgroundField";
import SubmitButton from "../../buttons/submitButton";
import shortenAddress from "../../utils/ShortenAddress";
import { isValidAddress } from "../../../lib/address/validator";
import { Exchange } from "../../../Models/Exchange";
import useWindowDimensions from "../../../hooks/useWindowDimensions";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import QRCodeModal from "@/components/QRCodeWallet";
import useCopyClipboard from "@/hooks/useCopyClipboard";

const ManualTransfer: FC = () => {
    const { swapResponse, depositActionsResponse } = useSwapDataState()
    const trasnsferACtionData = depositActionsResponse?.find(a => true)

    let generatedDepositAddress = trasnsferACtionData?.to_address

    return (
        <div className='rounded-xl bg-secondary-500  w-full h-full items-center relative'>
            <TransferInvoice deposit_address={generatedDepositAddress} />
        </div>
    )
}

const TransferInvoice: FC<{ deposit_address?: string }> = ({ deposit_address }) => {
    const { swapResponse: swapResponse } = useSwapDataState()
    const { swap, quote: swapQuote } = swapResponse || {}
    const { isMobile } = useWindowDimensions()
    const [isCopied, setCopied] = useCopyClipboard()

    const minAllowedAmount = swapQuote?.min_receive_amount

    const handleCopyClick = () => {
        if (deposit_address) {
            setCopied(deposit_address);
        }
    };

    const {
        source_exchange,
        source_network,
        source_token,
    } = swap || {}
    const source_network_internal_name = swap?.source_network.name

    //TODO pick manual transfer minAllowedAmount when its available
    // const requested_amount = Number(minAllowedAmount) > Number(swap?.requested_amount) ? minAllowedAmount : swap?.requested_amount

    // const handleChangeSelectedNetwork = useCallback((n: NetworkCurrency) => {
    //     setSelectedAssetNetwork(n)
    // }, [])

    return <div className='divide-y divide-secondary-300 text-primary-text h-full px-3'>
        {source_exchange && <div className={`w-full relative rounded-md px-3 py-3 shadow-xs border-secondary-700 border bg-secondary-700 flex flex-col items-center justify-center gap-2`}>
            <ExchangeNetworkPicker />
        </div>
        }
        <div className="py-3 ">
            <p className="text-lg  text-primary-text">
                {`Transfer ${source_token?.symbol} to`}
            </p>
        </div>
        <div className="flex flex-col divide-x divide-secondary-500">
            <div className="relative w-full">
                <div className='w-full relative  py-3 shadow-xs border-secondary-700 rounded-xl  bg-secondary-500 space-y-2'>
                    <div>
                        <p className="block text-sm text-secondary-text">
                            Deposit address
                        </p>

                        <div className="flex items-center justify-between leading-5 w-full mt-1 space-x-2">
                            {
                                deposit_address ?
                                    <p className='break-all text-secondary-text space-y-2 w-3/4'>
                                        {deposit_address}
                                    </p>
                                    :
                                    <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                            }
                            {
                                deposit_address &&
                                <div className="space-x-2 flex self-start">
                                    <QRCodeModal qrUrl={deposit_address?.toLocaleString()} iconSize={isMobile ? 20 : 16} className=' text-secondary-text bg-secondary-text/10 p-1.5 hover:text-primary-text rounded-sm' />
                                </div>
                            }
                        </div>
                    </div>
                    <SubmitButton type="button" onClick={handleCopyClick}>
                        {isCopied ? "Copied" : "Copy address"}
                    </SubmitButton>
                </div>
            </div>
        </div>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
            <div className='grid grid-cols-3 divide-x divide-secondary-500'>
                <div className="col-span-2">
                    <BackgroundField header={'Send type'} withoutBorder>
                        <div className='flex items-center text-xs sm:text-sm'>
                            <ArrowLeftRight className='hidden sm:inline-block sm:h-4 sm:w-4' />
                            <p>
                                To Another Loopring L2 Account
                            </p>
                        </div>
                    </BackgroundField>
                </div>
                <BackgroundField header={'Address Type'} withoutBorder>
                    <p className="text-xs sm:text-sm">
                        EOA Wallet
                    </p>
                </BackgroundField>
            </div>
        }
    </div>
}

const ExchangeNetworkPicker: FC<{ onChange?: (exchnage: Exchange) => void }> = ({ onChange }) => {
    const { swapResponse: swap } = useSwapDataState()

    //const exchangeAssets = source_exchange?.assets?.filter(a => a.asset === source_network_asset && a.network_internal_name !== destination_network && a.network?.status !== "inactive")
    //const defaultSourceNetwork = exchangeAssets?.find(sn => sn.is_default) || exchangeAssets?.[0]

    // const handleChangeSelectedNetwork = useCallback((n: string) => {
    //     const network = exchangeAssets?.find(network => network?.network_internal_name === n)
    //     if (network)
    //         onChange(network)
    // }, [exchangeAssets])

    return <div className='flex items-center gap-1 text-sm my-2'>
        <span>Network:</span>
        {/* {exchangeAssets?.length === 1 ? */}
        <div className='flex space-x-1 items-center w-fit font-semibold text-primary-text'>
            <ImageWithFallback alt="chainLogo" height='20' width='20' className='h-5 w-5 rounded-md ring-2 ring-secondary-600' src={swap?.swap.source_network.logo || ''} />
            <span>{swap?.swap.source_network.display_name}</span>
        </div>
        {/* :
            <Select onValueChange={handleChangeSelectedNetwork} defaultValue={defaultSourceNetwork?.network_internal_name}>
                <SelectTrigger className="w-fit border-none text-primary-text! font-semibold! h-fit! p-0!">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Networks</SelectLabel>
                        {exchangeAssets?.map(sn => (
                            <SelectItem key={sn.network_internal_name} value={sn.network_internal_name}>
                                <div className="flex items-center">
                                    <div className="shrink-0 h-5 w-5 relative">
                                        {
                                            sn.network &&
                                            <ImageWithFallback
                                                src={resolveImgSrc(sn.network)}
                                                alt="From Logo"
                                                height="60"
                                                width="60"
                                                className="rounded-md object-contain"
                                            />
                                        }
                                    </div>
                                    <div className="mx-1 block">{sn?.network?.display_name}</div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        } */}
    </div>
}

export default ManualTransfer