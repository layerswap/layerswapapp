import { FC } from "react"
import { useSwapDataState } from "../../context/swap"
import { classNames } from "../utils/classNames"
import Image from 'next/image'
import { ArrowRight } from "lucide-react"
import { SwapType } from "../../lib/layerSwapApiClient"
import { CalculateReceiveAmount } from "../../lib/fees"
import { useSettingsState } from "../../context/settings"

type Props = {
    children?: JSX.Element | JSX.Element[];
}

const SwapConfirmMainData: FC<Props> = ({ children }) => {
    const { swapFormData } = useSwapDataState()
    const { networks, currencies, resolveImgSrc } = useSettingsState()
    const { amount, currency, from, to } = swapFormData || {}
    const receive_amount = CalculateReceiveAmount(swapFormData, networks, currencies)

    return <div>
        <h3 className='mb-7 pt-2 sm:text-lg font-roboto text-white font-semibold'>
            Please confirm the swap details
        </h3>
        <div className="w-full">
            <div className="rounded-md w-full mb-3">
                <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-primary-text">
                    <div className='flex-row flex justify-between bg-darkblue-700 rounded-md items-center px-4 py-3'>
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-5 w-5 relative">
                                {
                                    resolveImgSrc(from) &&
                                    <Image
                                        src={resolveImgSrc(from)}
                                        alt="From Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                    />
                                }
                            </div>
                            <div className="mx-1 text-white">{from?.display_name.toUpperCase()}</div>
                        </div>
                        <ArrowRight className='h-5 w-5 block' />
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-5 w-5 relative">
                                {
                                    resolveImgSrc(to) &&
                                    <Image
                                        src={resolveImgSrc(to)}
                                        alt="Network Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                    />
                                }
                            </div>
                            <div className="ml-1 text-white">{to?.display_name.toUpperCase()}</div>
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