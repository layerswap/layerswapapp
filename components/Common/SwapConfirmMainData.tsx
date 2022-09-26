import { FC } from "react"
import { useSwapDataState } from "../../context/swap"
import { classNames } from "../utils/classNames"
import Image from 'next/image'
import { ArrowRightIcon } from "@heroicons/react/outline"
import { CalculateReceiveAmount } from "../../lib/fees"
import { getCurrencyDetails } from "../../helpers/currencyHelper"

type Props = {
    children?: JSX.Element | JSX.Element[];
}

const SwapConfirmMainData: FC<Props> = ({ children }) => {
    const { swapFormData } = useSwapDataState()
    const { amount, swapType, currency, exchange, network } = swapFormData || {}
    const receive_amount = CalculateReceiveAmount(Number(amount), currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType)
    const currencyDetails = getCurrencyDetails(currency?.baseObject, exchange?.baseObject, network?.baseObject, swapType)

    return <div>
        <h3 className='mb-7 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
            Please confirm your swap
        </h3>
        <div className="w-full">
            <div className="rounded-md w-full mb-3">
                <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-primary-text">
                    <div className={classNames(swapType === "offramp" ? 'flex-row-reverse  space-x-reverse' : 'flex-row', 'flex justify-between bg-darkblue-500 rounded-md items-center px-4 py-3')}>
                        <span className="text-left flex"><span className='hidden md:block'>{swapType === "onramp" ? "From" : "To"}</span>
                            <div className="flex items-center">
                                <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                    {
                                        exchange?.imgSrc &&
                                        <Image
                                            src={exchange?.imgSrc}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    }
                                </div>
                                <div className="mx-1 text-white">{exchange?.name.toUpperCase()}</div>
                            </div>
                        </span>
                        <ArrowRightIcon className='h-5 w-5 block md:hidden' />
                        <span className="flex"><span className='hidden md:block'>{swapType === "onramp" ? "To" : "From"}</span>
                            <div className="flex items-center">
                                <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                    {
                                        network?.imgSrc &&
                                        <Image
                                            src={network?.imgSrc}
                                            alt="Network Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    }
                                </div>
                                <div className="ml-1 text-white">{network?.name.toUpperCase()}</div>
                            </div>
                        </span>
                    </div>

                    <div className="flex justify-between px-4 py-3 items-baseline">
                        <span className="text-left">Amount</span>
                        <span className="text-white">{amount} {currency?.name}
                        </span>
                    </div>
                    <div className="flex justify-between bg-darkblue-500 rounded-md px-4 py-3 items-baseline">
                        <span className="text-left">Fee</span>
                        <span className="text-white">{(Number(amount) - receive_amount).toFixed(currencyDetails.precision)} {currency?.name}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3  items-baseline">
                        <span className="text-left">You will receive</span>
                        <span className="text-white">{receive_amount} {currency?.name}</span>
                    </div>
                </div>
            </div>
            {children}
        </div>
    </div>
}
export default SwapConfirmMainData