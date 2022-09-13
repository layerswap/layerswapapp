import { FC } from "react"
import { useSwapDataState } from "../../context/swap"
import { classNames } from "../utils/classNames"
import Image from 'next/image'
import { ArrowRightIcon } from "@heroicons/react/outline"
import { CalculateReceiveAmount } from "../../lib/fees"

type Props = {
    children?: JSX.Element | JSX.Element[];
}

const SwapConfirmMainData: FC<Props> = ({ children }) => {
    const { swapFormData } = useSwapDataState()

    const receive_amount = CalculateReceiveAmount(Number(swapFormData?.amount), swapFormData?.currency?.baseObject, swapFormData?.exchange?.baseObject, swapFormData?.swapType)

    return <div>
        <h3 className='mb-7 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
            Please confirm your swap
        </h3>
        <div className="w-full">
            <div className="rounded-md w-full mb-3">
                <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-pink-primary-300">
                    <div className={classNames(swapFormData?.swapType === "offramp" ? 'flex-row-reverse  space-x-reverse' : 'flex-row', 'flex justify-between bg-darkblue-500 rounded-md items-center px-4 py-3')}>
                        <span className="text-left flex"><span className='hidden md:block'>{swapFormData?.swapType === "onramp" ? "From" : "To"}</span>
                            <div className="flex items-center">
                                <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                    {
                                        swapFormData?.exchange?.imgSrc &&
                                        <Image
                                            src={swapFormData?.exchange?.imgSrc}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    }
                                </div>
                                <div className="mx-1 text-white">{swapFormData?.exchange?.name.toUpperCase()}</div>
                            </div>
                        </span>
                        <ArrowRightIcon className='h-5 w-5 block md:hidden' />
                        <span className="flex"><span className='hidden md:block'>{swapFormData?.swapType === "onramp" ? "To" : "From"}</span>
                            <div className="flex items-center">
                                <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                    {
                                        swapFormData?.network?.imgSrc &&
                                        <Image
                                            src={swapFormData?.network?.imgSrc}
                                            alt="Network Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    }
                                </div>
                                <div className="ml-1 text-white">{swapFormData?.network?.name.toUpperCase()}</div>
                            </div>
                        </span>
                    </div>

                    <div className="flex justify-between px-4 py-3 items-baseline">
                        <span className="text-left">Amount</span>
                        <span className="text-white">{swapFormData?.amount} {swapFormData?.currency?.name}
                        </span>
                    </div>
                    <div className="flex justify-between bg-darkblue-500 rounded-md px-4 py-3 items-baseline">
                        <span className="text-left">Fee</span>
                        <span className="text-white">{(Number(swapFormData?.amount) - receive_amount).toFixed(swapFormData?.currency?.baseObject.precision)} {swapFormData?.currency?.name}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3  items-baseline">
                        <span className="text-left">You will receive</span>
                        <span className="text-white">{receive_amount} {swapFormData?.currency?.name}</span>
                    </div>
                </div>
            </div>
            {children}
        </div>
    </div>
}
export default SwapConfirmMainData