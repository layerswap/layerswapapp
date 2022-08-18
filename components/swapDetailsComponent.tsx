import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react'
import { useSettingsState } from '../context/settings';
import LayerSwapApiClient, { SwapItemResponse } from '../lib/layerSwapApiClient';
import TokenService from '../lib/TokenService';
import { StatusIcon } from './swapHistoryComponent';
import Image from 'next/image'
import { DocumentDuplicateIcon } from '@heroicons/react/outline';
import { copyTextToClipboard } from './utils/copyToClipboard';
import toast from 'react-hot-toast';
import ClickTooltip from './Tooltips/ClickTooltip';
import shortenAddress from './utils/ShortenAddress';

type Props = {
    id: string
}

const SwapDetails: FC<Props> = ({ id }) => {
    const { data } = useSettingsState()
    const [swap, setSwap] = useState<SwapItemResponse>()
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const exchange = data.exchanges?.find(e => e.internal_name === swap?.data?.exchange)
    const network = data.networks?.find(n => n.code === swap?.data?.network)
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
        return <Sceleton />

    return (
        <>
            <div className="w-full grid grid-flow-row animate-fade-in">
                <div className="rounded-md w-full grid grid-flow-row">
                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-pink-primary-300">
                        <div className="flex justify-between p items-baseline">
                            <span className="text-left">Id </span>
                            <span className="text-white">
                                <div className='inline-flex items-center'>
                                    <span className="mr-2">{shortenAddress(swap?.data?.id)}</span>
                                    <ClickTooltip text='Copied!' moreClassNames="bottom-3 right-0">
                                        <div className='border-0 ring-transparent' onClick={() => copyTextToClipboard(swap?.data?.id)}>
                                            <DocumentDuplicateIcon className="h-4 w-4 text-gray-600" />
                                        </div>
                                    </ClickTooltip>
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
                            <span className="text-left">Exchange </span>
                            {
                                exchange && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        <Image
                                            src={exchange?.logo_url}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <div className="mx-1 text-white">{exchange?.name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Network </span>
                            {
                                network && <div className="flex items-center">
                                    <div className="flex-shrink-0 h-5 w-5 relative">
                                        <Image
                                            src={network?.logo_url}
                                            alt="Exchange Logo"
                                            height="60"
                                            width="60"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <div className="mx-1 text-white">{network?.name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Address </span>
                            <span className='text-white font-normal'>{swap?.data?.destination_address.slice(0, 8) + "..." + swap?.data?.destination_address.slice(swap?.data?.destination_address.length - 5, swap?.data?.destination_address.length)}</span>
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
                            swap?.data?.type === 'on_ramp' &&
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

const Sceleton = () => {
    return <div className="animate-pulse"><div className="w-full grid grid-flow-row">
        <div className="rounded-md bg-darkBlue w-full grid grid-flow-row">
            <div className="items-center block text-base font-lighter leading-6 text-pink-primary-300">
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-400 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                {[...Array(9)]?.map((item, index) => (
                    <>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                            <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                        </div>
                    </>
                ))}
            </div>
        </div>
    </div>
    </div>
}

export default SwapDetails;