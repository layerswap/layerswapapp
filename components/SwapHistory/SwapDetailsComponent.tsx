import { FC, useState } from 'react'
import LayerSwapApiClient, { SwapResponse, TransactionType } from '../../lib/apiClients/layerSwapApiClient';
import shortenAddress, { shortenEmail } from '../utils/ShortenAddress';
import CopyButton from '../buttons/copyButton';
import StatusIcon from './StatusIcons';
import { ArrowRight, ExternalLink, Fuel, Info, RefreshCw } from 'lucide-react';
import isGuid from '../utils/isGuid';
import KnownInternalNames from '../../lib/knownIds';
import { useQueryState } from '../../context/query';
import { ApiResponse } from '../../Models/ApiResponse';
import { Partner } from '../../Models/Partner';
import useSWR from 'swr';
import { isValidAddress } from '../../lib/address/validator';
import { ExtendedAddress } from '../Input/Address/AddressPicker/AddressWithIcon';
import { addressFormat } from '../../lib/address/formatter';
import { truncateDecimals } from '../utils/RoundDecimals';
import Link from 'next/link';
import calculateDatesDifference from '../../lib/calculateDatesDifference';
import { SwapStatus } from '../../Models/SwapStatus';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn/popover';
import { ImageWithFallback } from '../Common/ImageWithFallback';
import { getDateDifferenceString } from '../utils/dateDifference';
import QuoteDetails from '../FeeDetails';

type Props = {
    swapResponse: SwapResponse
}

const SwapDetails: FC<Props> = ({ swapResponse }) => {
    const [open, setOpen] = useState(false)

    const { swap, refuel, quote } = swapResponse
    const { source_token, destination_token, destination_address, source_network, destination_network, source_exchange, destination_exchange, requested_amount } = swap

    const router = useRouter()
    const {
        hideFrom,
        hideTo,
        account,
        appName
    } = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data

    const input_tx_explorer_template = source_network?.transaction_explorer_template
    const output_tx_explorer_template = destination_network?.transaction_explorer_template

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)

    const source = (hideFrom && partner && account) ? partner : source_network
    const destination = (hideTo && partner && account) ? partner : destination_network

    const receive_amount = swapOutputTransaction?.amount ?? quote?.receive_amount
    const receiveAmountInUsd = receive_amount ? (destination_token?.price_in_usd * receive_amount).toFixed(2) : undefined
    const requestedAmountInUsd = requested_amount && (source_token?.price_in_usd * requested_amount).toFixed(2)

    const inputTransactionFee = swapInputTransaction?.fee_amount
    const inputTransactionFeeInUsd = inputTransactionFee && swapInputTransaction?.fee_token && (swapInputTransaction?.fee_token?.price_in_usd * inputTransactionFee)
    const displayInputFeeInUsd = inputTransactionFeeInUsd ? (inputTransactionFeeInUsd < 0.01 ? '<$0.01' : `$${inputTransactionFeeInUsd?.toFixed(2)}`) : null
    const calculatedFeeAmountInUsd = inputTransactionFeeInUsd ? inputTransactionFeeInUsd + quote?.total_fee_in_usd : quote?.total_fee_in_usd
    const displayCalculatedFeeAmountInUsd = calculatedFeeAmountInUsd ? (calculatedFeeAmountInUsd < 0.01 ? '<$0.01' : `$${calculatedFeeAmountInUsd?.toFixed(2)}`) : null
    const displayLayerswapFeeInUsd = quote?.total_fee_in_usd ? (quote?.total_fee_in_usd < 0.01 ? '<$0.01' : `$${quote?.total_fee_in_usd?.toFixed(2)}`) : null
    const nativeCurrency = refuel?.token
    const truncatedRefuelAmount = nativeCurrency && !!refuel ?
        truncateDecimals(refuel.amount, nativeCurrency?.precision) : null

    let sourceAccountAddress: string | undefined = undefined
    if (hideFrom && account) {
        sourceAccountAddress = account;
    }
    else if (swapInputTransaction?.from) {
        sourceAccountAddress = swapInputTransaction?.from;
    }
    else if (source_network?.name === KnownInternalNames.Exchanges.Coinbase && swap?.exchange_account_connected) {
        sourceAccountAddress = shortenEmail(swap?.exchange_account_name, 10);
    }
    else if (source_exchange) {
        sourceAccountAddress = "Exchange"
    }

    return (
        <>
            {/* Swap */}
            <section className='pb-3 space-y-3'>
                <div className='p-3 bg-secondary-500 rounded-xl'>
                    <div className='text-sm flex flex-col gap-3'>
                        <div className="flex justify-between items-center text-sm text-primary-text">
                            <p className="text-left text-secondary-text">Transaction ID</p>
                            <CopyButton toCopy={swap?.id} iconClassName='order-2 ml-1 text-primary-text'>
                                {shortenAddress(swap?.id)}
                            </CopyButton>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left text-secondary-text">Date & Time</span>
                            <span className='text-primary-text'>{(new Date(swap.created_date)).toLocaleString()} <span className='text-primary-text-placeholder'>({getDateDifferenceString(new Date(swap.created_date))})</span></span>
                        </div>
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left text-secondary-text">Status </span>
                            <span className="text-primary-text">
                                <StatusIcon swap={swap} />
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className='pb-3'>
                <div className='flex flex-col justify-between w-full h-full gap-3'>
                    <div className='space-y-3'>

                        {/* Source and Destination Transactions */}
                        <div className='p-3 bg-secondary-500 rounded-xl text-primary-text'>
                            <div className='text-sm flex flex-col gap-3'>
                                <div className="flex justify-between items-baseline">
                                    <p className="text-left text-secondary-text">Source transaction</p>
                                    {
                                        swapInputTransaction?.transaction_hash ?
                                            <Link
                                                target="_blank"
                                                href={input_tx_explorer_template?.replace("{0}", swapInputTransaction.transaction_hash)}
                                                className='flex items-center space-x-1'
                                            >
                                                <span>{shortenAddress(swapInputTransaction.transaction_hash)}</span>
                                                <ExternalLink className='h-4' />
                                            </Link>
                                            :
                                            <span>-</span>
                                    }
                                </div >
                                <div className="flex justify-between items-baseline">
                                    <p className="text-left text-secondary-text">Destination transaction</p>
                                    {
                                        swapOutputTransaction?.transaction_hash ?
                                            (
                                                (swapOutputTransaction?.transaction_hash && swap?.destination_exchange?.name === KnownInternalNames.Exchanges.Coinbase && (isGuid(swapOutputTransaction?.transaction_hash))) ?
                                                    <span><CopyButton toCopy={swapOutputTransaction.transaction_hash} iconClassName="text-primary-text order-2">{shortenAddress(swapOutputTransaction.transaction_hash)}</CopyButton></span>
                                                    :
                                                    <Link
                                                        target="_blank"
                                                        href={output_tx_explorer_template?.replace("{0}", swapOutputTransaction.transaction_hash)}
                                                        className='flex items-center space-x-1'
                                                    >
                                                        <span>{shortenAddress(swapOutputTransaction.transaction_hash)}</span>
                                                        <ExternalLink className='h-4' />
                                                    </Link>
                                            )
                                            :
                                            <span>-</span>
                                    }
                                </div >
                            </div>
                        </div>
                    </div>

                    {
                        swap.status === SwapStatus.Completed &&
                        <button
                            type='button'
                            onClick={() => router.push({
                                pathname: `/`,
                                query: {
                                    amount: requested_amount,
                                    destination_address: destination_address,
                                    from: source_network?.name,
                                    to: destination_network?.name,
                                    fromAsset: source_token.symbol,
                                    toAsset: destination_token.symbol,
                                    ...resolvePersistantQueryParams(router.query),
                                }
                            }, undefined, { shallow: false })}
                            className='w-full inline-flex items-center gap-2 justify-center py-2.5 px-3 text-xl font-semibold bg-primary-text-placeholder hover:opacity-90 duration-200 active:opacity-80 transition-opacity rounded-lg text-secondary-950'
                        >
                            <RefreshCw className='h-6 w-6' />
                            <p>
                                Repeat Swap
                            </p>
                        </button>
                    }
                    {
                        (swap.status !== SwapStatus.Completed && swap.status !== SwapStatus.Expired && swap.status !== SwapStatus.Failed) &&
                        <button
                            type='button'
                            onClick={() => router.push({
                                pathname: `/swap/${swap.id}`,
                                query: resolvePersistantQueryParams(router.query),
                            }, undefined, { shallow: false })}
                            className='w-full inline-flex items-center gap-2 justify-center py-2.5 px-3 text-xl font-semibold bg-primary hover:opacity-90 duration-200 active:opacity-80 transition-opacity rounded-lg text-primary-text'
                        >
                            <p>
                                {swap.status == SwapStatus.LsTransferPending ? "View Swap" : "Complete Swap"}
                            </p>
                        </button>
                    }

                </div>
            </section>
        </>
    )
}

export default SwapDetails;
