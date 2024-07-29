import { FC, useEffect, useState, memo } from "react";
import Image from 'next/image'
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { ExchangeNetwork } from "../../Models/Exchange";

type TransferCEXProps = {
    values: SwapFormValues;
    manuItems: ISelectMenuItem[] | undefined;
    value: SelectMenuItem<ExchangeNetwork> | undefined;
    selectedItem?: ISelectMenuItem | null;
}

const TransferCEX: FC<TransferCEXProps> = ({ values, manuItems, value, selectedItem }) => {
    const [currentValue, setCurrentImgSrc] = useState<ISelectMenuItem | null>(manuItems && manuItems.length > 0 ? manuItems[0] : null);

    useEffect(() => {
        if (selectedItem) {
            setCurrentImgSrc(selectedItem);
        } else if (manuItems && manuItems.length > 0) {
            const interval = setInterval(() => {
                setCurrentImgSrc(prevImgSrc => {
                    if (!prevImgSrc) return manuItems[0];
                    const currentIndex = manuItems.indexOf(prevImgSrc);
                    const nextIndex = (currentIndex + 1) % manuItems.length;
                    return manuItems[nextIndex];
                });
            }, 500);
            return () => clearInterval(interval);
        }
    }, [manuItems, selectedItem]);

    const { from, to, fromExchange, toExchange } = values
    const sourceLogo = from ? from.logo : fromExchange?.logo
    const destinationLogo = to ? to.logo : toExchange?.logo

    return (
        <div className="bg-secondary-700 rounded-lg px-2 py-1 border border-secondary-500 w-full relative z-10 mt-1">
            <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                <div className="w-full">
                    <div className="flex items-center gap-3">
                        <div>
                            {fromExchange ?
                                <p className="text-primary-text-placeholder text-xs leading-5">
                                    The network you select here will be used as an intermediary for the transfer from {"{CEX}"} to {"{chain}"}. Before selecting the network, please check which one is available on {"{CEX}"} for withdrawal.
                                </p>
                                :
                                <p className="text-primary-text-placeholder text-xs leading-5">
                                    The network you select here will be used as an intermediary for the transfer from {"{chain}"} to {"{CEX}"}. Before selecting the network, please check which one is available on {"{CEX}"} for deposit.
                                </p>
                            }
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0 h-4 w-4 relative">
                            {(values.from || values.fromExchange) && <Image
                                src={sourceLogo!}
                                alt="Project Logo"
                                height="40"
                                width="40"
                                loading="eager"
                                className="rounded-md object-contain"
                            />}
                        </div>
                        <div className="w-full h-[2px] bg-gray-300 my-2" />
                        <AnimatedImage src={currentValue?.imgSrc ?? ''} />
                        <div className="w-full h-[1px] bg-gray-300 my-2" />
                        <div className="flex-shrink-0 h-4 w-4 relative">
                            {(values.to || values.toExchange) && <Image
                                src={destinationLogo!}
                                alt="Project Logo"
                                height="40"
                                width="40"
                                loading="eager"
                                className="rounded-md object-contain"
                            />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TransferCEX;

const AnimatedImage: FC<{ src: string }> = memo(({ src }) => (
    <div className="flex-shrink-0 h-6 w-6 relative">
        <Image
            src={src}
            alt="Project Logo"
            height="40"
            width="40"
            loading="eager"
            className="rounded-md object-contain"
        />
    </div>
));