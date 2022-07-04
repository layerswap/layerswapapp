import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react'
import { useSettingsState } from '../context/settings';
import { useSwapDataState, useSwapDataUpdate } from '../context/swap';
import LayerSwapApiClient, { Swap, SwapDetailsResponse } from '../lib/layerSwapApiClient';
import TokenService from '../lib/TokenService';
import { StatusIcon } from './swapHistoryComponent';
import Image from 'next/image'

type Props = {
    id: string
}

const swaps = [
    {
        id: 1,
        from: 'Coinbase',
        to: 'Loopring',
        amount: 2154,
        fee: 12.38,
        date: '12.02.22',
        currency: '(LRC)',
        status: 'confirmed',
        transId: 111
    },
    {
        id: 2,
        from: 'Binance',
        to: 'Arbitrum',
        amount: 0.15,
        fee: 0.0028,
        date: '22.03.22',
        currency: '(ETH)',
        status: 'failed',
        transId: 555
    },
]

const SwapDetails: FC<Props> = ({ id }) => {
    const { exchanges, networks } = useSettingsState()
    const [swap, setSwap] = useState<SwapDetailsResponse>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const exchange = exchanges?.find(e => e.internal_name == swap?.payment?.exchange)
    const network = networks.find(n => n.code === swap?.network)
    useEffect(() => {
        (async () => {
            if (!id)
                return
            setLoading(true)
            try {
                const authData = TokenService.getAuthData();
                if (!authData) {
                    router.push({
                        pathname: '/login',
                        query: { redirect: '/transactions' }
                    })
                    return;
                }
                const layerswapApiClient = new LayerSwapApiClient()
                const swap = await layerswapApiClient.getSwapDetails(id, authData.access_token)
                setSwap(swap)
            }
            catch (e) {
                setError(e.message)
            }
            finally {
                setLoading(false)
            }
        })()
    }, [id])

    if (loading)
        return <Sceleton />

    console.log("swapDe", swap)
    return (
        <>
            <div className="w-full grid grid-flow-row animate-fade-in">
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-4">
                    <div className="items-center mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <div className='text-xl text-white mb-2'>Swap Details</div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Status: </span>
                            <span className="">
                                {swap && <StatusIcon swap={swap} />}
                            </span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Create date: </span>
                            <span className='text-white font-normal'>{(new Date(swap?.created_date)).toLocaleString()}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Exchange: </span>
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
                                    <div className="mx-1">{exchange?.name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Network: </span>
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
                                    <div className="mx-1">{network?.name}</div>
                                </div>
                            }
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Address: </span>
                            <span className='text-white font-normal'>{swap?.destination_address.slice(0, 8) + "..." + swap?.destination_address.slice(swap?.destination_address.length - 5, swap?.destination_address.length)}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Amount: </span>
                            <span className='text-white font-normal'>{swap?.payment?.amount} {swap?.payment?.currency}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Fee: </span>
                            <span className='text-white font-normal'>~{swap?.payment?.manual_flow_context?.current_withdrawal_fee} {swap?.payment?.currency}</span>
                        </div>
                        
                    </div>
                    {/* <div className="items-center inline-flex mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <p className="inline-flex">Payment Number: <span className="text-right text-white">#52848</span></p>
                    </div> */}
                </div>
            </div>
        </>
    )
}

const Sceleton = () => {
    return <div className="animate-pulse"><div className="w-full grid grid-flow-row">
        <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-4">
            <div className="items-center mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                <div className='text-xl text-white mb-2'>Swap Details</div>
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-400 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
                <hr className='horizontal-gradient my-1' />
                <div className="flex justify-between items-baseline">
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 m-2 w-1/4 bg-slate-700 rounded col-span-1"></div>
                </div>
            </div>
            {/* <div className="items-center inline-flex mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
            <p className="inline-flex">Payment Number: <span className="text-right text-white">#52848</span></p>
        </div> */}
        </div>
    </div>
    </div>
}

export default SwapDetails;