import { FC } from "react"
import { useSwapDataState } from "../../context/swap"
import { classNames } from "../utils/classNames"
import Image from 'next/image'
import { ArrowRight } from "lucide-react"
import LayerSwapApiClient, { SwapType } from "../../lib/layerSwapApiClient"
import { CalculateReceiveAmount } from "../../lib/fees"
import { useSettingsState } from "../../context/settings"
import { useQueryState } from "../../context/query"
import { ApiResponse } from "../../Models/ApiResponse"
import { Partner } from "../../Models/Partner"
import useSWR from "swr"
import shortenAddress from "../utils/ShortenAddress"

type Props = {
    children?: JSX.Element | JSX.Element[];
}

const SwapConfirmMainData: FC<Props> = ({ children }) => {
    const { swapFormData } = useSwapDataState()
    const { networks, currencies, resolveImgSrc } = useSettingsState()
    const { amount, currency, from, to } = swapFormData || {}
    const {
        hideFrom,
        hideTo,
        account,
        addressSource,
        hideAddress
    } = useQueryState()

    const receive_amount = CalculateReceiveAmount(swapFormData, networks, currencies)

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(addressSource && `/apps?name=${addressSource}`, layerswapApiClient.fetcher)


    const partner = partnerData?.data

    const source = hideFrom ? partner : from
    const destination = hideTo ? partner : to

    return <div>
        <h3 className='mb-7 pt-2 sm:text-lg font-roboto text-white font-semibold'>
            Please confirm the swap details
        </h3>
        <div className="w-full">
            <div className="rounded-md w-full mb-3">
                <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-primary-text">
                    <div className='flex-row flex justify-between bg-secondary-700 rounded-md items-center px-4 py-3'>
                        <div className="flex items-center ">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5">
                                    <Image
                                        src={resolveImgSrc(source)}
                                        alt="From Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                    />
                                </div>
                                <div className="mx-1">
                                    <div className="text-white">
                                        {source?.display_name.toUpperCase()}
                                    </div>
                                    {
                                        hideFrom && account &&
                                        <div className="text-sm text-primary-text">
                                            {shortenAddress(account)}
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                        <ArrowRight className='h-5 w-5 block' />
                        <div className="flex items-center ">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5">
                                    <Image
                                        src={resolveImgSrc(destination)}
                                        alt="Network Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                    />
                                </div>
                                <div className="mx-1">
                                    <div className="text-white">
                                        {destination?.display_name?.toUpperCase()}
                                    </div>
                                    {
                                        hideAddress && hideTo && account &&
                                        <div className="text-sm text-primary-text">
                                            {shortenAddress(account)}
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between px-4 py-3 items-baseline">
                        <span className="text-left">Sending</span>
                        <span className="text-white">{amount} <span className="text-primary-text">{currency?.asset}</span></span>
                    </div>
                    <div className="flex justify-between px-4 py-3  items-baseline">
                        <span className="text-left">Receiving</span>
                        <span className="text-white">{receive_amount} <span className="text-primary-text">{currency?.asset}</span></span>
                    </div>
                </div>
            </div>
            {children}
        </div>
    </div >
}
export default SwapConfirmMainData