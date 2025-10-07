import { FC } from 'react'
import NumberFlow from '@number-flow/react'
import Image from 'next/image'
import GasIcon from '../../icons/GasIcon'
import ExchangeGasIcon from '../../icons/ExchangeGasIcon'
import AverageCompletionTime from '../../Common/AverageCompletionTime'
import { ChevronDown } from 'lucide-react'
import AddressIcon from '../../AddressIcon'
import shortenAddress from '../../utils/ShortenAddress'
import rewardCup from '@/public/images/rewardCup.png'
import clsx from 'clsx'
import { Wallet } from '@/Models/WalletProvider'
import Clock from '@/components/icons/Clock'
import { SwapValues } from '..'
import { isValidAddress } from '@/lib/address/validator'
import { addressFormat } from '@/lib/address/formatter'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'

export const SummaryRow: FC<{
    isQuoteLoading?: boolean
    values: SwapValues
    wallet?: Wallet
    computed: ReturnType<typeof import('./utils').deriveQuoteComputed>
    shouldCheckNFT?: string | false | undefined
    nftBalance?: number
    isLoading?: boolean
    error?: any
    onOpen?: () => void
    isOpen?: boolean
    sourceAddress?: string
}> = ({ isQuoteLoading, values, wallet, computed, shouldCheckNFT, nftBalance, isLoading, error, onOpen, sourceAddress, isOpen }) => {
    const { gasFeeInUsd, avgCompletionTime, reward, receiveAtLeast } = computed

    return (
        <div className="flex flex-col w-full pt-1">
            {values.destination_address && sourceAddress?.toLowerCase() !== values.destination_address?.toLowerCase() && (
                <div className={`${isOpen ? "py-3" : "py-3"} flex items-center w-full justify-between gap-1 text-sm`}>
                    <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                        <label>Send to</label>
                    </div>
                    <div className="text-right text-primary-text">
                        <span className="cursor-pointer hover:underline flex items-center gap-2">
                            {wallet?.icon ? (
                                <wallet.icon className="w-4 h-4 p-0.5 bg-white rounded-sm" />
                            ) : (
                                <AddressIcon className="h-4 w-4" address={values.destination_address} size={36} rounded="4px" />
                            )}
                            {
                                ((isValidAddress(values?.destination_address, values?.to) && values?.to) ?
                                    <div className="text-sm group/addressItem text-secondary-text">
                                        <ExtendedAddress address={addressFormat(values?.destination_address, values?.to)} network={values?.to} showDetails={wallet ? true : false} title={wallet?.displayName?.split("-")[0]} description={wallet?.providerName} logo={wallet?.icon} shouldShowChevron={false} />
                                    </div>
                                    :
                                    <p className="text-sm text-secondary-text">{shortenAddress(values?.destination_address)}</p>)
                            }
                        </span>
                    </div>
                </div>
            )}

            <div className={`${isOpen ? "pt-3" : "py-3"} flex items-center w-full justify-between gap-1 text-sm`}>
                <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                    <label>Receive at least</label>
                </div>
                <div className="text-right text-primary-text">
                    {receiveAtLeast !== undefined && (
                        <span className="text-sm ml-1 font-small">{receiveAtLeast} {values?.toAsset?.symbol}</span>
                    )}
                </div>
            </div>

            <div className={`${isOpen ? "hidden" : ""} flex items-center py-3`}>
                {gasFeeInUsd != null && (
                    <div className={clsx('inline-flex items-center gap-1', { 'animate-pulse-strong': isQuoteLoading })}>
                        <div className='p-0.5'>
                            {!values.fromExchange ?
                                <GasIcon className='h-4 w-4 text-secondary-text' /> : <ExchangeGasIcon className='h-5 w-5 text-secondary-text' />
                            }
                        </div>
                        <NumberFlow
                            className="text-primary-text text-sm leading-6"
                            value={gasFeeInUsd < 0.01 ? '0.01' : gasFeeInUsd}
                            format={{ style: 'currency', currency: 'USD' }}
                            prefix={gasFeeInUsd < 0.01 ? '<' : undefined}
                        />
                        <div className="mx-1 w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                    </div>
                )}

                {avgCompletionTime && (
                    <div className={clsx('text-right inline-flex items-center gap-1 text-sm ml-1', { 'animate-pulse-strong': isQuoteLoading })}>
                        <div className='p-0.5'>
                            <Clock className='h-4 w-4 text-secondary-text' />
                        </div>
                        <AverageCompletionTime className="text-primary-text" avgCompletionTime={avgCompletionTime} />
                    </div>
                )}

                {
                    reward &&
                    (!shouldCheckNFT || (!isLoading && !error && nftBalance !== undefined && nftBalance > 0)) &&
                    <>
                        <div className="w-px h-3 bg-primary-text-placeholder rounded-2xl" />
                        <div className='text-right text-primary-text inline-flex items-center gap-1 pr-4'>
                            <Image src={rewardCup} alt="Reward" width={16} height={16} />
                            <NumberFlow value={reward?.amount_in_usd < 0.01 ? '0.01' : reward?.amount_in_usd} format={{ style: 'currency', currency: 'USD' }} prefix={reward?.amount_in_usd < 0.01 ? '<' : undefined} />
                        </div>
                    </>
                }

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpen?.()
                    }}
                    className="flex items-center text-secondary-text text-sm whitespace-nowrap gap-0.5 ml-auto hover:text-primary-text"
                    aria-label="See details"
                >
                    <span>See details</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}