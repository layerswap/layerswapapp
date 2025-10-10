import { FC } from 'react'
import { ChevronDown } from 'lucide-react'
import AddressIcon from '@/components/Common/AddressIcon'
import shortenAddress from '@/components/utils/ShortenAddress'
import { Wallet } from '@/types/wallet'
import { SwapValues } from '..'
import { isValidAddress } from '@/lib/address/validator'
import { addressFormat } from '@/lib/address/formatter'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'
import { DetailsButton } from '..'
import { Quote } from '@/lib/apiClients/layerSwapApiClient'
import { Network } from '@/Models/Network'
import clsx from 'clsx'

export const SummaryRow: FC<{
    destination?: Network
    destinationAddress?: string
    isQuoteLoading?: boolean
    values: SwapValues
    wallet?: Wallet
    onOpen?: () => void
    isOpen?: boolean
    sourceAddress?: string
    quoteData: Quote
}> = ({ quoteData, isQuoteLoading, values, wallet, onOpen, sourceAddress, isOpen, destination, destinationAddress }) => {
    return (
        <div className={clsx("flex flex-col w-full p-2", { "!pb-0 !-mb-1": isOpen })}>
            {values.destination_address && sourceAddress?.toLowerCase() !== values.destination_address?.toLowerCase() && (
                <div className={`flex items-center w-full justify-between gap-1 text-sm px-2 py-3`}>
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

            <div className="flex items-center w-full justify-between gap-1 text-sm px-2 py-3">
                <div className="inline-flex items-center text-left text-secondary-text">
                    <label>Receive at least</label>
                </div>
                <div className="text-right text-primary-text">
                    {quoteData?.quote?.min_receive_amount !== undefined && (
                        <span className="text-sm font-small">{quoteData?.quote?.min_receive_amount} {values?.toAsset?.symbol}</span>
                    )}
                </div>
            </div>

            <div className={`${isOpen ? "hidden" : ""} flex items-center w-full justify-between px-2 py-3`}>
                <DetailsButton quote={quoteData} isQuoteLoading={isQuoteLoading} swapValues={values} destination={destination} destinationAddress={destinationAddress} />

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onOpen?.()
                    }}
                    className="flex items-center text-secondary-text text-sm whitespace-nowrap gap-0.5 hover:text-primary-text"
                    aria-label="See details"
                >
                    <span>See details</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}