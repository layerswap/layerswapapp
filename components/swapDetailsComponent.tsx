import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react'
import { useSettingsState } from '../context/settings';
import LayerSwapApiClient, { SwapItemResponse, SwapType } from '../lib/layerSwapApiClient';
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
    const { exchanges, networks, discovery: { resource_storage_url } } = data

    const [swap, setSwap] = useState<SwapItemResponse>()
    const [loading, setLoading] = useState(false)
    const router = useRouter();



    const exchange = exchanges?.find(e => e.currencies.some(ec => ec.id === swap?.data?.exchange_currency_id))
    const network = networks?.find(n => n.currencies.some(nc => nc.id === swap?.data?.network_currency_id))
    const source = swap?.data?.type == SwapType.OnRamp ? exchange : network;
    const destination = swap?.data?.type == SwapType.OnRamp ? network : exchange;
    const currencyDetails = exchange?.currencies?.find(x => x.id == swap?.data?.exchange_currency_id)

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
                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-primary-text">
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
                                {swap && <StatusIcon status={swap.data.status} />}
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Date </span>
                            <span className='text-white font-normal'>{(new Date(swap?.data?.created_date)).toLocaleString()}</span>
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">From {swap?.data?.type === SwapType.OnRamp ? 'Exchange' : "Network"} </span>
                            {
                                source && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            source.logo &&
                                            <Image
                                                src={`${resource_storage_url}${source?.logo}`}
                                                alt="Exchange Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }

                                    </div>
                                    <div className="mx-1 text-white">{source?.display_name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">To {swap?.data?.type === SwapType.OnRamp ? 'Network' : "Exchange"} </span>
                            {
                                destination && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        {
                                            destination.logo &&
                                            <Image
                                                src={`${resource_storage_url}${destination?.logo}`}
                                                alt="Exchange Logo"
                                                height="60"
                                                width="60"
                                                layout="responsive"
                                                className="rounded-md object-contain"
                                            />
                                        }
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
                            <span className="text-left">Requested Amount </span>
                            <span className='text-white font-normal flex'>
                                {swap?.data?.requested_amount} {currencyDetails?.asset}
                            </span>
                        </div>
                        <hr className='horizontal-gradient' />
                        {
                            swap?.data?.status == 'completed' &&
                            <>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Received Amount </span>
                                    <span className='text-white font-normal flex'>
                                        {swap?.data?.received_amount} {currencyDetails?.asset}
                                    </span>
                                </div>
                                <hr className='horizontal-gradient' />
                            </>
                        }
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Layerswap Fee </span>
                            <span className='text-white font-normal'>{parseFloat(swap?.data?.fee?.toFixed(currencyDetails?.precision))} {currencyDetails?.asset}</span>
                        </div>
                        {
                            swap?.data?.type === SwapType.OnRamp && swap?.data?.fee >= 0 &&
                            <>
                                <hr className='horizontal-gradient' />
                                <div className="flex justify-between items-baseline">
                                    <span className="text-left">Exchange Fee </span>
                                    <span className='text-white font-normal'>{parseFloat(swap?.data?.fee?.toFixed(currencyDetails?.precision))} {currencyDetails?.asset}</span>
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