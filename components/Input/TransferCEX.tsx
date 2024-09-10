import { FC, useEffect, useState, memo } from "react";
import Image from 'next/image'
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { ExchangeNetwork } from "../../Models/Exchange";
import Link from "next/link";

type TransferCEXProps = {
    values: SwapFormValues;
    manuItems: ISelectMenuItem[] | undefined;
    value: SelectMenuItem<ExchangeNetwork> | undefined;
    selectedItem?: ISelectMenuItem | null;
}

const TransferCEX: FC<TransferCEXProps> = ({ values, manuItems, value, selectedItem }) => {
    const { from, to, fromExchange, toExchange } = values
    const sourceLogo = fromExchange ? fromExchange.logo : from?.logo
    const destinationLogo = toExchange ? toExchange.logo : to?.logo

    const learnMoreUrl = fromExchange ? 'https://docs.layerswap.io/user-docs/layerswap-app/transfer-from-cex' : 'https://docs.layerswap.io/user-docs/layerswap-app/transfer-to-cex'

    return (<div className="font-normal flex flex-col w-full relative z-10 my-3 pb-4 border-b-2 border-b-secondary">
        <div className="w-full px-2.5 space-y-2">
            <div className="flex items-center mb-">
                <p className="text-primary-text-placeholder text-base leading-5">
                    <span>Please select an intermediary network available on </span>
                    <span>{fromExchange ? fromExchange.display_name : toExchange?.display_name}&nbsp;</span>
                    <span>to be used for </span>
                    <span>{fromExchange ? 'withdrawal' : 'deposit'}</span><span>.</span>
                    <a target='_blank' href={learnMoreUrl} className='text-primary-text-placeholder underline hover:no-underline decoration-primary-text-placeholder ml-1 cursor-pointer'>Learn more</a>
                </p>
            </div>
            <div className="relative flex items-center space-x-2 space-y-2">
                <div className="flex-shrink-0 h-6 w-6 relative">
                    {(values.from || values.fromExchange) && <Image
                        src={sourceLogo!}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain"
                    />}
                </div>
                <div className="w-full h-[2px] bg-primary-text-placeholder my-2 line line-left" />
                <div className="flex-shrink-0 h-9 w-9 relative">
                    {value ? <Image
                        src={value?.imgSrc}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain"
                    /> : <div className="mainImage flex justify-center items-center bg-secondary-400 h-full w-full rounded-md">
                        <span className="font-bold text-primary-text-placeholder text-xl">?</span>
                    </div>}
                </div>
                <div className="w-full h-[2px] bg-primary-text-placeholder my-2 line line-right" />
                <div className="flex-shrink-0 h-6 w-6 relative">
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
    );
}

export default TransferCEX;
