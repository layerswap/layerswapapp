import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react'
import { useSettingsState } from '../context/settings';
import LayerSwapApiClient, { SwapItemResponse } from '../lib/layerSwapApiClient';
import TokenService from '../lib/TokenService';
import Image from 'next/image'
import toast from 'react-hot-toast';
import shortenAddress from './utils/ShortenAddress';
import CopyButton from './buttons/copyButton';
import { SwapDetailsComponentSceleton } from './Sceletons';
import StatusIcon from './StatusIcons';

type Props = {
    id: string
}

const SwapDetails: FC<Props> = ({ id }) => {
    const { data } = useSettingsState()
    const [swap, setSwap] = useState<SwapItemResponse>()
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const exchange = data.exchanges?.find(e => e.internal_name === swap?.data?.exchange)
    const network = data.networks?.find(n => n.internal_name === swap?.data?.network)
    const source = swap?.data?.type == "on_ramp" ? exchange : network;
    const destination = swap?.data?.type == "on_ramp" ? network : exchange;
    const currency = data.currencies.find(x => x.id == swap?.data?.currency_id)
    useEffect(() => {
        (async () => {
            if (!id)
                return
            setLoading(true)
            try {
                const authData = TokenService.getAuthData();
                if (!authData) {
                    router.push({
                        pathname: '/auth',
                        query: { ...(router.query), redirect: '/transactions' }
                    })
                    return;
                }
                const layerswapApiClient = new LayerSwapApiClient()
                const swap = await layerswapApiClient.getSwapDetails(id, authData.access_token)
                setSwap(swap)
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
                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-pink-primary-300">
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Id </span>
                            <span className="text-white">
                                <div className='inline-flex items-center'>
                                    <CopyButton toCopy={swap?.data?.id} iconClassName="text-gray-500">
                                        {shortenAddress(swap?.data?.id)}
                                    </CopyButton>
                                </div>
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Status </span>
                            <span className="text-white">
                                {swap && <StatusIcon swap={swap.data} />}
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Date </span>
                            <span className='text-white font-normal'>{(new Date(swap?.data?.created_date)).toLocaleString()}</span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">From {swap?.data?.type === 'on_ramp' ? 'Exchange' : "Network"} </span>
                            {
                                source && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        <Image
                                            src={source?.logo_url}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <div className="mx-1 text-white">{source?.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">To {swap?.data?.type === 'on_ramp' ? 'Network' : "Exchange"} </span>
                            {
                                destination && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        <Image
                                            src={destination?.logo_url}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <div className="mx-1 text-white">{destination?.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Address </span>
                            <span className="text-white">
                                <div className='inline-flex items-center'>
                                    <CopyButton toCopy={swap?.data?.destination_address} iconClassName="text-gray-500">
                                        {swap?.data?.destination_address.slice(0, 8) + "..." + swap?.data?.destination_address.slice(swap?.data?.destination_address.length - 5, swap?.data?.destination_address.length)}
                                    </CopyButton>
                                </div>
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Amount </span>
                            <span className='text-white font-normal'>{swap?.data?.amount} {currency?.asset}</span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Layerswap Fee </span>
                            <span className='text-white font-normal'>{parseFloat(swap?.data?.fee?.toFixed(currency?.precision))} {currency?.asset}</span>
                        </div>
                        {
                            swap?.data?.type === 'on_ramp' && swap?.data?.payment?.withdrawal_fee >= 0 &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Exchange Fee </span>
                                    <span className='text-white font-normal'>{parseFloat(swap?.data?.payment?.withdrawal_fee?.toFixed(currency?.precision))} {currency?.asset}</span>
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