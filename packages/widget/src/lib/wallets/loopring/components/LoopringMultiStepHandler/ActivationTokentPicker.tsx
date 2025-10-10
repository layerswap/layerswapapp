import { FeeData, useLoopringTokens } from './hooks';
import { ISelectMenuItem } from '@/components/Select/Shared/Props/selectMenuItem';
import formatAmount from '@/lib/formatAmount';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { UserBalanceInfo } from '@/lib/wallets/loopring/services/transferService/loopring/defs';
import { ImageWithFallback } from '@/components/Common/ImageWithFallback';
import AppSettings from '@/lib/AppSettings';

type Props = {
    availableBalances: UserBalanceInfo[] | undefined,
    defaultValue: UserBalanceInfo | undefined,
    feeData: FeeData | undefined,
    onSelect: (v: string | undefined) => void
    selectedValue: string | undefined
}

export const ActivationTokenPicker = ({ availableBalances, defaultValue, onSelect, feeData, selectedValue }: Props) => {
    const { tokens } = useLoopringTokens()

    const resource_storage_url = AppSettings.ResourseStorageUrl;
    const activationCurrencyValues: ISelectMenuItem[]
        = tokens && availableBalances?.map(b => {
            const loopringToken = tokens?.find(t => t.tokenId === b.tokenId)
            const symbol: string = loopringToken?.symbol || "-"
            const decimals = loopringToken?.decimals
            const details = <p className="text-primary-text-tertiary">
                {decimals ? `${formatAmount(b.total, decimals)}` : ''}
            </p>
            return {
                id: symbol,
                name: symbol,
                isAvailable: true,
                type: 'currency',
                imgSrc: `${resource_storage_url}layerswap/currencies/${symbol.toLowerCase()}.png`,
                baseObject: symbol,
                details,
                order: 0,
            }
        }) || []


    const handleChange = (v: string) => {
        onSelect(v)
    }


    useEffect(() => {
        if (!selectedValue && defaultValue && tokens) {
            const loopringToken = tokens?.find(t => t.tokenId === defaultValue.tokenId)
            if (loopringToken)
                handleChange(loopringToken?.symbol)
        }
    }, [defaultValue, tokens])

    const loopringToken = tokens?.find(t => t.symbol === selectedValue)

    const decimals = loopringToken?.decimals
    const selectedTokenFee = feeData?.fees?.find(f => f.token === selectedValue)?.fee
    const formattedFee = selectedTokenFee && decimals && formatAmount(selectedTokenFee, decimals)

    return <p className="break-allspace-x-1 flex mt-4 w-full justify-end items-center text-sm text-secondary-text">
        <span className='font-base sm:inline hidden'>One time activation fee</span>
        <span className='text-primary-text text-sm sm:text-base flex items-center'>
            <span className=' text-secondary-text text-sm ml-1'>
                {
                    activationCurrencyValues.length > 0 ? <Select onValueChange={handleChange} value={selectedValue} >
                        <SelectTrigger className="w-fit border-none text-primary-text! font-semibold! h-fit! p-0!">
                            <SelectValue>
                                <span className='space-x-1'><span>{formattedFee}</span><span>{selectedValue}</span></span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Fee token</SelectLabel>
                                {activationCurrencyValues?.map(cv => (
                                    <SelectItem key={cv.name} value={cv.name}>
                                        <div className="flex items-center">
                                            <div className="shrink-0 h-5 w-5 relative">
                                                {
                                                    cv &&
                                                    <ImageWithFallback
                                                        src={cv.imgSrc}
                                                        alt="From Logo"
                                                        height="60"
                                                        width="60"
                                                        className="rounded-md object-contain"
                                                    />
                                                }
                                            </div>
                                            <div className="mx-1 block"><span className='text-primary-text'>{cv.name}</span> <span>{cv.details}</span></div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                        : <></>
                }
            </span>
        </span>
    </p>
}
