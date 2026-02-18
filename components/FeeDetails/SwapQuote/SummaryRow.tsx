import { FC, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import AddressIcon from '../../AddressIcon'
import { Address } from "@/lib/address";
import { Wallet } from '@/Models/WalletProvider'
import { SwapValues } from '..'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'
import { DetailsButton } from '..'
import { Quote } from '@/lib/apiClients/layerSwapApiClient'
import clsx from 'clsx'
import { Slippage } from '../Slippage'
import { GasFee } from './DetailedEstimates'
import NumberFlow from '@number-flow/react'
import { Partner } from '@/Models/Partner'
import { useQueryState } from '@/context/query'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'

export const SummaryRow: FC<{
    isQuoteLoading?: boolean
    values: SwapValues
    wallet?: Wallet
    onOpen?: () => void
    isOpen?: boolean
    sourceAddress?: string
    quoteData: Quote
    partner?: Partner
}> = ({ quoteData, isQuoteLoading, values, wallet, onOpen, sourceAddress, isOpen, partner }) => {
    const query = useQueryState()
    const { destination_address: destinationAddressFromQuery } = query
    const { to, destination_address } = values
    const addressProviderIcon = destinationAddressFromQuery && partner?.is_wallet && Address.equals(destinationAddressFromQuery, values?.destination_address!, values?.to!) && partner?.logo
    const addressInstance = useMemo(() => (destination_address && to) ? new Address(destination_address, to) : null, [destination_address, to])

    return (
        <div className={clsx("flex flex-col w-full p-2", { "pb-0 -mb-1": isOpen })}>
            {values.destination_address && sourceAddress?.toLowerCase() !== values.destination_address?.toLowerCase() && (
                <div className={`flex items-center w-full justify-between gap-1 text-sm px-2 py-3`}>
                    <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                        <label>Send to</label>
                    </div>
                    <div className="text-right text-primary-text">
                        <span className="cursor-pointer hover:underline flex items-center gap-2">
                            {wallet?.icon ? (
                                <wallet.icon className="w-4 h-4 bg-secondary-700 rounded-sm" />
                            ) : addressProviderIcon ? (
                                <ImageWithFallback
                                    alt="Partner logo"
                                    className="rounded-md object-contain h-4 w-4"
                                    src={addressProviderIcon}
                                    width="36"
                                    height="36"
                                />) : (
                                <AddressIcon className="h-4 w-4" address={addressInstance?.full || ''} size={36} rounded="4px" />
                            )}
                            {
                                ((Address.isValid(values?.destination_address, values?.to) && values?.to) ?
                                    <div className="text-sm group/addressItem text-secondary-text">
                                        <ExtendedAddress address={values?.destination_address} network={values?.to} showDetails={wallet ? true : false} title={wallet?.displayName?.split("-")[0]} description={wallet?.providerName} logo={wallet?.icon} shouldShowChevron={false} />
                                    </div>
                                    :
                                    <p className="text-sm text-secondary-text">{addressInstance?.toShortString() || ''}</p>)
                            }
                        </span>
                    </div>
                </div>
            )}

            <div className="flex items-center w-full justify-between gap-1 text-sm px-2 py-3">
                <div className="inline-flex items-center text-left text-secondary-text">
                    <label>Receive at least</label>
                </div>
                <div className="text-right text-primary-text h-5">
                    {quoteData?.quote?.min_receive_amount !== undefined && !isNaN(quoteData?.quote?.min_receive_amount) && (
                        <NumberFlow value={quoteData?.quote?.min_receive_amount} trend={0} format={{ maximumFractionDigits: quoteData?.quote.destination_token?.decimals || 2 }} suffix={` ${values?.toAsset?.symbol}`} />
                    )}
                </div>
            </div>
            <Slippage quoteData={quoteData.quote} values={values} />
            {
                isOpen &&
                <GasFee values={values} quote={quoteData.quote} />
            }
            <div className={`${isOpen ? "hidden" : ""} flex items-center w-full justify-between px-2 py-3`}>
                <DetailsButton quote={quoteData?.quote} isQuoteLoading={isQuoteLoading} swapValues={values} destination={to} destinationAddress={destination_address} reward={quoteData?.reward} />

                <button
                    data-attr="see-swap-details"
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