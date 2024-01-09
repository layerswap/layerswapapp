import { FC, useCallback, useEffect } from "react"
import useSWR from "swr"
import { ArrowLeftRight } from "lucide-react"
import Image from 'next/image';
import { ApiResponse } from "../../../Models/ApiResponse";
import { useSettingsState } from "../../../context/settings";
import { useSwapDataState } from "../../../context/swap";
import KnownInternalNames from "../../../lib/knownIds";
import BackgroundField from "../../backgroundField";
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from "../../../lib/layerSwapApiClient";
import SubmitButton from "../../buttons/submitButton";
import shortenAddress from "../../utils/ShortenAddress";
import { isValidAddress } from "../../../lib/addressValidator";
import { useSwapDepositHintClicked } from "../../../stores/swapTransactionStore";
import { useFee } from "../../../context/feeContext";

const ManualTransfer: FC = () => {
    const { swap } = useSwapDataState()
    const hintsStore = useSwapDepositHintClicked()
    const hintClicked = hintsStore.swapTransactions[swap?.id || ""]
    const { source_network: source_network_internal_name } = swap || {}

    const layerswapApiClient = new LayerSwapApiClient()
    const {
        data: generatedDeposit,
        isLoading
    } = useSWR<ApiResponse<DepositAddress>>(`/networks/${source_network_internal_name}/deposit_addresses`,
        layerswapApiClient.fetcher,
        {
            dedupingInterval: 60000,
            shouldRetryOnError: false
        }
    )

    let generatedDepositAddress = generatedDeposit?.data?.address
    let shouldGenerateAddress = !generatedDepositAddress && hintClicked

    const handleCloseNote = useCallback(async () => {
        if (swap)
            hintsStore.setSwapDepositHintClicked(swap?.id)
    }, [swap, hintsStore])

    return (
        <div className='rounded-md bg-secondary-700 border border-secondary-500 w-full h-full items-center relative'>
            <div className={!hintClicked ? "absolute w-full h-full flex flex-col items-center px-3 pb-3 text-center" : "hidden"}>
                <div className="flex flex-col items-center justify-center h-full pb-2">
                    <div className="max-w-xs">
                        <p className="text-base text-primary-text">
                            About manual transfers
                        </p>
                        <p className="text-xs text-secondary-text">
                            Transfer assets to Layerswap’s deposit address to complete the swap.
                        </p>
                    </div>
                </div>
                <SubmitButton isDisabled={false} isSubmitting={false} size="medium" onClick={handleCloseNote}>
                    OK
                </SubmitButton>
            </div>
            <div className={hintClicked ? "flex" : "invisible"}>
                <TransferInvoice address={generatedDepositAddress} shouldGenerateAddress={shouldGenerateAddress} />
            </div>
        </div>
    )

}

const TransferInvoice: FC<{ address?: string, shouldGenerateAddress: boolean }> = ({ address: existingDepositAddress, shouldGenerateAddress }) => {

    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const { valuesChanger, minAllowedAmount } = useFee()

    const {
        source_network: source_network_internal_name,
        destination_network: destination_network_internal_name,
        source_network_asset,
        destination_network_asset
    } = swap || {}

    const source = layers.find(n => n.internal_name === source_network_internal_name)
    const sourceAsset = source?.assets.find(c => c.asset == source_network_asset)
    const destination = layers.find(n => n.internal_name === destination_network_internal_name)
    const destinationAsset = destination?.assets.find(c => c.asset == destination_network_asset)

    useEffect(() => {
        if (swap) {
            valuesChanger({
                amount: swap.requested_amount.toString(),
                destination_address: swap.destination_address,
                from: source,
                fromCurrency: sourceAsset,
                to: destination,
                toCurrency: destinationAsset,
                refuel: swap.has_refuel,
            })
        }
    }, [swap])

    const layerswapApiClient = new LayerSwapApiClient()
    const generateDepositParams = shouldGenerateAddress ? [source?.internal_name ?? null] : null

    const {
        data: generatedDeposit
    } = useSWR<ApiResponse<DepositAddress>>(generateDepositParams, ([network]) => layerswapApiClient.GenerateDepositAddress(network), { dedupingInterval: 60000 })

    //TODO pick manual transfer minAllowedAmount when its available
    const requested_amount = Number(minAllowedAmount) > Number(swap?.requested_amount) ? minAllowedAmount : swap?.requested_amount
    const depositAddress = existingDepositAddress || generatedDeposit?.data?.address

    // const handleChangeSelectedNetwork = useCallback((n: NetworkCurrency) => {
    //     setSelectedAssetNetwork(n)
    // }, [])

    return <div className='divide-y divide-secondary-500 text-primary-text h-full'>
        {/* {source_exchange && <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-secondary-700 border bg-secondary-700 flex flex-col items-center justify-center gap-2`}>
            <ExchangeNetworkPicker onChange={handleChangeSelectedNetwork} />
        </div>
        } */}
        <div className="flex divide-x divide-secondary-500">
            <BackgroundField Copiable={true} QRable={true} header={"Deposit address"} toCopy={depositAddress} withoutBorder>
                <div>
                    {
                        depositAddress ?
                            <p className='break-all'>
                                {depositAddress}
                            </p>
                            :
                            <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                    }
                    {
                        (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                        <div className='flex text-xs items-center py-1 mt-1 border-2 border-secondary-300 rounded border-dashed text-secondary-text'>
                            <p>
                                This address might not be activated. You can ignore it.
                            </p>
                        </div>
                    }
                </div>
            </BackgroundField>
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

        <div className='flex divide-x divide-secondary-500'>
            <BackgroundField Copiable={true} toCopy={requested_amount} header={'Amount'} withoutBorder>
                <p>
                    {requested_amount}
                </p>
            </BackgroundField>
            <BackgroundField header={'Asset'} withoutBorder Explorable={sourceAsset?.contract_address != null && isValidAddress(sourceAsset?.contract_address, source)} toExplore={sourceAsset?.contract_address != null ? source?.account_explorer_template?.replace("{0}", sourceAsset?.contract_address) : undefined}>
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 h-7 w-7 relative">
                        {
                            sourceAsset &&
                            <Image
                                src={resolveImgSrc({ asset: sourceAsset?.asset })}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            />
                        }
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold leading-4">
                            {sourceAsset?.asset}
                        </span>
                        {sourceAsset?.contract_address && isValidAddress(sourceAsset.contract_address, source) &&
                            <span className="text-xs text-secondary-text flex items-center leading-3">
                                {shortenAddress(sourceAsset?.contract_address)}
                            </span>
                        }
                    </div>
                </div>
            </BackgroundField>
        </div>
    </div>
}

// const ExchangeNetworkPicker: FC<{ onChange: (network: NetworkCurrency) => void }> = ({ onChange }) => {
//     const { layers, resolveImgSrc } = useSettingsState()
//     const { swap } = useSwapDataState()
//     const {
//         source_exchange: source_exchange_internal_name,
//         destination_network,
//         source_network_asset } = swap || {}
//     const source_exchange = layers.find(n => n.internal_name === source_exchange_internal_name)

//     const exchangeAssets = source_exchange?.assets?.filter(a => a.asset === source_network_asset && a.network_internal_name !== destination_network && a.network?.status !== "inactive")
//     const defaultSourceNetwork = exchangeAssets?.find(sn => sn.is_default) || exchangeAssets?.[0]

//     const handleChangeSelectedNetwork = useCallback((n: string) => {
//         const network = exchangeAssets?.find(network => network?.network_internal_name === n)
//         if (network)
//             onChange(network)
//     }, [exchangeAssets])

//     return <div className='flex items-center gap-1 text-sm my-2'>
//         <span>Network:</span>
//         {exchangeAssets?.length === 1 ?
//             <div className='flex space-x-1 items-center w-fit font-semibold text-primary-text'>
//                 <Image alt="chainLogo" height='20' width='20' className='h-5 w-5 rounded-md ring-2 ring-secondary-600' src={resolveImgSrc(exchangeAssets?.[0])}></Image>
//                 <span>{defaultSourceNetwork?.network?.display_name}</span>
//             </div>
//             :
//             <Select onValueChange={handleChangeSelectedNetwork} defaultValue={defaultSourceNetwork?.network_internal_name}>
//                 <SelectTrigger className="w-fit border-none !text-primary-text !font-semibold !h-fit !p-0">
//                     <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                     <SelectGroup>
//                         <SelectLabel>Networks</SelectLabel>
//                         {exchangeAssets?.map(sn => (
//                             <SelectItem key={sn.network_internal_name} value={sn.network_internal_name}>
//                                 <div className="flex items-center">
//                                     <div className="flex-shrink-0 h-5 w-5 relative">
//                                         {
//                                             sn.network &&
//                                             <Image
//                                                 src={resolveImgSrc(sn.network)}
//                                                 alt="From Logo"
//                                                 height="60"
//                                                 width="60"
//                                                 className="rounded-md object-contain"
//                                             />
//                                         }
//                                     </div>
//                                     <div className="mx-1 block">{sn?.network?.display_name}</div>
//                                 </div>
//                             </SelectItem>
//                         ))}
//                     </SelectGroup>
//                 </SelectContent>
//             </Select>
//         }
//     </div>
// }


const Sceleton = () => {
    return <div className="animate-pulse rounded-lg p-4 flex items-center text-center bg-secondary-700 border border-secondary-500">
        <div className="flex-1 space-y-6 py-1 p-8 pt-4 items-center">
            <div className="h-2 bg-secondary-text rounded self-center w-16 m-auto"></div>
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-secondary-text rounded col-span-2"></div>
                    <div className="h-2 bg-secondary-text rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-secondary-text rounded"></div>

            </div>
            <div className="h-2 bg-secondary-text rounded"></div>
        </div>
    </div>
}



export default ManualTransfer