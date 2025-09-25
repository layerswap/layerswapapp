import { FC } from 'react'
import { SwapResponse, TransactionType } from '../../lib/apiClients/layerSwapApiClient';
import shortenAddress, { shortenEmail } from '../utils/ShortenAddress';
import CopyButton from '../buttons/copyButton';
import StatusIcon from './StatusIcons';
import { ExternalLink } from 'lucide-react';
import isGuid from '../utils/isGuid';
import KnownInternalNames from '../../lib/knownIds';
import { useQueryState } from '../../context/query';
import Link from 'next/link';
import { SwapStatus } from '../../Models/SwapStatus';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import { getDateDifferenceString } from '../utils/dateDifference';

type Props = {
    swapResponse: SwapResponse
}

const SwapDetails: FC<Props> = ({ swapResponse }) => {

    const { swap } = swapResponse
    const { source_token, destination_token, destination_address, source_network, destination_network, source_exchange, requested_amount } = swap

    const router = useRouter()
    const { hideFrom, account } = useQueryState()

    const input_tx_explorer_template = source_network?.transaction_explorer_template
    const output_tx_explorer_template = destination_network?.transaction_explorer_template

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const refundTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refund)

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
                            <span className='text-primary-text'>{(new Date(swap.created_date)).toLocaleString()} <span className='text-primary-text-tertiary'>{getDateDifferenceString(new Date(swap.created_date))}</span></span>
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
                                    {
                                        swap.status == SwapStatus.Refunded ?
                                            <>
                                                <p className="text-left text-secondary-text">Refund transaction</p>
                                                {
                                                    refundTransaction?.transaction_hash ?
                                                        (
                                                            (refundTransaction?.transaction_hash && swap?.destination_exchange?.name === KnownInternalNames.Exchanges.Coinbase && (isGuid(refundTransaction?.transaction_hash))) ?
                                                                <span><CopyButton toCopy={refundTransaction.transaction_hash} iconClassName="text-primary-text order-2">{shortenAddress(refundTransaction.transaction_hash)}</CopyButton></span>
                                                                :
                                                                <Link
                                                                    target="_blank"
                                                                    href={output_tx_explorer_template?.replace("{0}", refundTransaction.transaction_hash)}
                                                                    className='flex items-center space-x-1'
                                                                >
                                                                    <span>{shortenAddress(refundTransaction.transaction_hash)}</span>
                                                                    <ExternalLink className='h-4' />
                                                                </Link>
                                                        )
                                                        :
                                                        <span>-</span>
                                                }
                                            </>
                                            :
                                            <>
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
                                            </>
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
                                    from: source_network?.name,
                                    to: destination_network?.name,
                                    fromAsset: source_token.symbol,
                                    toAsset: destination_token.symbol,
                                    ...resolvePersistantQueryParams(router.query),
                                }
                            }, undefined, { shallow: false })}
                            className='w-full inline-flex items-center gap-2 justify-center py-3 px-6 text-base font-semibold bg-primary-text-tertiary hover:opacity-90 duration-200 active:opacity-80 transition-opacity rounded-xl text-white'
                        >
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
