import { FC, useCallback, useEffect, useState } from "react"
import useSWR from "swr"
import QRCode from "qrcode.react"
import colors from 'tailwindcss/colors';
import { AlignLeft, ArrowLeftRight, Megaphone } from "lucide-react"
import Image from 'next/image';
import { ApiResponse } from "../../../Models/ApiResponse";
import { useSettingsState } from "../../../context/settings";
import { useSwapDataState } from "../../../context/swap";
import KnownInternalNames from "../../../lib/knownIds";
import BackgroundField from "../../backgroundField";
import LayerSwapApiClient, { DepositAddress, DepositAddressSource } from "../../../lib/layerSwapApiClient";
import SubmitButton from "../../buttons/submitButton";
import { KnownErrorCode } from "../../../Models/ApiError";
import { Widget } from "../../Widget/Index";

const ManualTransfer: FC = () => {
    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const source_network = layers.find(n => n.internal_name === source_network_internal_name)

    const asset = source_network?.assets?.find(currency => currency?.asset === destination_network_asset)

    const layerswapApiClient = new LayerSwapApiClient()
    const {
        data: generatedDeposit,
        isLoading
    } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${source_network_internal_name}?source=${DepositAddressSource.UserGenerated}`,
        layerswapApiClient.fetcher,
        {
            dedupingInterval: 60000,
            shouldRetryOnError: false
        }
    )

    let generatedDepositAddress = generatedDeposit?.data?.address
    const [messageClicked, setMessageClicked] = useState(false)

    const handleCloseNote = useCallback(async () => {
        setMessageClicked(true)
    }, [])

    if (isLoading) {
        return <div className='flex justify-center'>
            <AlignLeft className='w-36 h-36 text-[#141c31]' />
        </div>
    }

    return (
        !(generatedDepositAddress || messageClicked) ?
            <div className="rounded-lg p-4 flex flex-col items-center text-center bg-secondary-700 border border-secondary-500 gap-5">
                <Megaphone className="h-10 w-10 text-primary-text" />
                <div className="max-w-xs">
                    <h3 className="text-lg text-white">
                        About manual transfers
                    </h3>
                    <p className="text-sm">
                        Transfer assets to Layerswap’s deposit address to complete the swap.
                    </p>
                </div>
                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleCloseNote}>
                    Got it
                </SubmitButton>
            </div>
            :
            <TransferInvoice address={generatedDepositAddress} />
    )

}

const TransferInvoice: FC<{ address?: string }> = ({ address }) => {

    const { layers, resolveImgSrc } = useSettingsState()
    const { swap } = useSwapDataState()
    const { source_network: source_network_internal_name, destination_network_asset } = swap
    const source_network = layers.find(n => n.internal_name === source_network_internal_name)

    const asset = source_network?.assets?.find(currency => currency?.asset === destination_network_asset)

    const layerswapApiClient = new LayerSwapApiClient()
    const generateDepositParams = address ? null : [source_network_internal_name]
    const {
        data: generatedDeposit
    } = useSWR<ApiResponse<DepositAddress>>(generateDepositParams, ([network]) => layerswapApiClient.GenerateDepositAddress(network), { dedupingInterval: 60000 })

    const depositAddress = address || generatedDeposit?.data?.address

    return <div className='rounded-md bg-secondary-700 border border-secondary-500 divide-y divide-secondary-500'>
        <div className={`w-full relative rounded-md px-3 py-3 shadow-sm border-secondary-700 border bg-secondary-700 flex flex-col items-center justify-center gap-2`}>
            <div className='p-2 bg-white/30 bg-opacity-30 rounded-xl'>
                <div className='p-2 bg-white/70 bg-opacity-70 rounded-lg'>
                    <QRCode
                        className="p-2 bg-white rounded-md"
                        value={depositAddress}
                        size={120}
                        bgColor={colors.white}
                        fgColor="#000000"
                        level={"H"}
                    />
                </div>
            </div>
        </div>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
            <BackgroundField header={'Send type'} withoutBorder>
                <div className='flex items-center space-x-2'>
                    <ArrowLeftRight className='h-4 w-4' />
                    <p>
                        To Another Loopring L2 Account
                    </p>
                </div>
            </BackgroundField>
        }
        <BackgroundField Copiable={true} toCopy={depositAddress} header={'Deposit Address'} withoutBorder>
            <div>
                {
                    depositAddress ?
                        <p className='break-all text-white'>
                            {depositAddress}
                        </p>
                        :
                        <div className='bg-gray-500 w-56 h-5 animate-pulse rounded-md' />
                }
                {
                    (source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet || source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli) &&
                    <div className='flex text-xs items-center px-2 py-1 mt-1 border-2 border-secondary-100 rounded border-dashed'>
                        <p>
                            You might get a warning that this is not an activated address. You can ignore it.
                        </p>
                    </div>
                }
            </div>
        </BackgroundField>
        {
            (source_network_internal_name === KnownInternalNames.Networks.LoopringGoerli || source_network_internal_name === KnownInternalNames.Networks.LoopringMainnet) &&
            <div className='flex space-x-4'>
                <BackgroundField header={'Address Type'} withoutBorder>
                    <p>
                        EOA Wallet
                    </p>
                </BackgroundField>
            </div>
        }
        <div className='flex divide-x divide-secondary-500'>
            <BackgroundField Copiable={true} toCopy={swap?.requested_amount} header={'Amount'} withoutBorder>
                <p>
                    {swap?.requested_amount}
                </p>
            </BackgroundField>
            <BackgroundField header={'Asset'} withoutBorder>
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        {
                            asset &&
                            <Image
                                src={resolveImgSrc({ asset: asset?.asset })}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            />
                        }
                    </div>
                    <div className="mx-1 block">{asset?.asset}</div>
                </div>
            </BackgroundField>
        </div>
    </div>
}



export default ManualTransfer