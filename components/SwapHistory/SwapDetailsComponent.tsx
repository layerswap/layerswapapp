import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react'
import LayerSwapApiClient, { SwapResponse, TransactionType } from '../../lib/layerSwapApiClient';
import Image from 'next/image'
import toast from 'react-hot-toast';
import shortenAddress from '../utils/ShortenAddress';
import CopyButton from '../buttons/copyButton';
import { SwapDetailsComponentSceleton } from '../Sceletons';
import StatusIcon from './StatusIcons';
import { ExternalLink } from 'lucide-react';
import isGuid from '../utils/isGuid';
import KnownInternalNames from '../../lib/knownIds';

type Props = {
    id: string
}

const SwapDetails: FC<Props> = ({ id }) => {
    const [swapData, setSwapData] = useState<SwapResponse>()
    const swap = swapData?.swap
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const { source_token, destination_token, source_network, destination_network } = swap || {}

    const input_tx_explorer_template = source_network?.transaction_explorer_template
    const output_tx_explorer_template = destination_network?.transaction_explorer_template

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)

    useEffect(() => {
        (async () => {
            if (!id)
                return
            setLoading(true)
            try {
                const layerswapApiClient = new LayerSwapApiClient()
                const swapResponse = await layerswapApiClient.GetSwapDetailsAsync(id)
                setSwapData(swapResponse.data)
            }
            catch (e) {
                toast.error(e.message)
            }
            finally {
                setLoading(false)
            }
        })()
    }, [id, router.query])

    if (loading)
        return <SwapDetailsComponentSceleton />

    return (
        <>
            <div className="w-full grid grid-flow-row animate-fade-in">
                <div className="rounded-md w-full grid grid-flow-row">
                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-secondary-text">
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Id </span>
                            <span className="text-primary-text">
                                <div className='inline-flex items-center'>
                                    {
                                        swap && <CopyButton toCopy={swap?.id} iconClassName="text-gray-500">
                                            {shortenAddress(swap?.id)}
                                        </CopyButton>
                                    }
                                </div>
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Status </span>
                            <span className="text-primary-text">
                                {swap && <StatusIcon swap={swap} />}
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Date </span>
                            {swap && <span className='text-primary-text font-normal'>{(new Date(swap.created_date)).toLocaleString()}</span>}
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">From  </span>
                            {
                                source_network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            <Image
                                                src={source_network.logo}
                                                alt="Exchange Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }

                                    </div>
                                    <div className="mx-1 text-primary-text">{source_network?.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">To </span>
                            {
                                destination_network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            <Image
                                                src={destination_network.logo}
                                                alt="Exchange Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }
                                    </div>
                                    <div className="mx-1 text-primary-text">{destination_network.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Address </span>
                            <span className="text-primary-text">
                                <div className='inline-flex items-center'>
                                    {swap && <CopyButton toCopy={swap.destination_address} iconClassName="text-gray-500">
                                        {swap?.destination_address.slice(0, 8) + "..." + swap?.destination_address.slice(swap?.destination_address.length - 5, swap?.destination_address.length)}
                                    </CopyButton>}
                                </div>
                            </span>
                        </div>
                        {swapInputTransaction?.transaction_hash &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Source Tx </span>
                                    <span className="text-primary-text">
                                        <div className='inline-flex items-center'>
                                            <div className='underline hover:no-underline flex items-center space-x-1'>
                                                <a target={"_blank"} href={input_tx_explorer_template?.replace("{0}", swapInputTransaction.transaction_hash)}>{shortenAddress(swapInputTransaction.transaction_hash)}</a>
                                                <ExternalLink className='h-4' />
                                            </div>
                                        </div>
                                    </span>
                                </div>
                            </>
                        }
                        {swapOutputTransaction?.transaction_hash &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Destination Tx </span>
                                    <span className="text-primary-text">
                                        <div className='inline-flex items-center'>
                                            <div className="">
                                                {(swapOutputTransaction?.transaction_hash && swap?.destination_exchange?.name === KnownInternalNames.Exchanges.Coinbase && (isGuid(swapOutputTransaction?.transaction_hash))) ?
                                                    <span><CopyButton toCopy={swapOutputTransaction.transaction_hash} iconClassName="text-gray-500">{shortenAddress(swapOutputTransaction.transaction_hash)}</CopyButton></span>
                                                    :
                                                    <div className='underline hover:no-underline flex items-center space-x-1'>
                                                        <a target={"_blank"} href={output_tx_explorer_template?.replace("{0}", swapOutputTransaction.transaction_hash)}>{shortenAddress(swapOutputTransaction.transaction_hash)}</a>
                                                        <ExternalLink className='h-4' />
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                    </span>
                                </div>
                            </>
                        }
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Requested amount</span>
                            <span className='text-primary-text font-normal flex'>
                                {swap?.requested_amount} {source_token?.symbol}
                            </span>
                        </div>
                        {
                            swapInputTransaction &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Transfered amount</span>
                                    <span className='text-primary-text font-normal flex'>
                                        {swapInputTransaction?.amount} {source_token?.symbol}
                                    </span>
                                </div>
                            </>
                        }
                        {
                            swapOutputTransaction &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Layerswap Fee </span>
                                    <span className='text-primary-text font-normal'>{swapData?.quote.total_fee} {source_token?.symbol}</span>
                                </div>
                            </>
                        }
                        {
                            swapOutputTransaction &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Amount You Received</span>
                                    <span className='text-primary-text font-normal flex'>
                                        {swapOutputTransaction?.amount} {destination_token?.symbol}
                                    </span>
                                </div>
                            </>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

export default SwapDetails;
