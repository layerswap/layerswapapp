import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../context/swap';
import LayerSwapApiClient, { Swap, SwapDetailsResponse } from '../lib/layerSwapApiClient';
import TokenService from '../lib/TokenService';

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

function statusIcon(status) {

    if (status === 'failed') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="30" fill="#E43636" />
                <path d="M20 41L40 20" stroke="white" strokeWidth="3.15789" stroke-linecap="round" />
                <path d="M20 20L40 41" stroke="white" strokeWidth="3.15789" stroke-linecap="round" />
            </svg>
        )
    } else if (status === 'confirmed') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="30" fill="#55B585" />
                <path d="M16.5781 29.245L25.7516 38.6843L42.6308 21.3159" stroke="white" strokeWidth="3.15789" stroke-linecap="round" />
            </svg>
        )
    }
}

const SwapDetails: FC<Props> = ({ id }) => {

    const [swap, setSwap] = useState<SwapDetailsResponse>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter();

    useEffect(() => {
        (async () => {
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

    return (
        <>
            <div className="w-full grid grid-flow-row animate-fade-in">
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-8">
                    <div className="items-center mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <div className='text-xl text-white mb-2'>Swap Details</div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Payment Number: </span>
                            <span className='text-white font-normal'>#{swap?.payment?.sequence_number}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Payment ID: </span>
                            <span className='text-white font-normal'>{swap?.payment?.id}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Create date: </span>
                            <span className='text-white font-normal'>{(new Date(swap?.created_date)).toLocaleString()}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Merchant: </span>
                            <span className='text-white font-normal'>Layerswap</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Payment Method: </span>
                            <span className='text-white font-normal'>{swap?.payment?.exchange}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Amount: </span>
                            <span className='text-white font-normal'>{swap?.payment?.amount} {swap?.payment?.currency}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Fee: </span>
                            <span className='text-white font-normal'>{swap?.payment?.manual_flow_context?.withdrawal_fee} {swap?.payment?.currency}</span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Status: </span>
                            <span className='text-white font-normal'></span>
                        </div>
                        <hr className='horizontal-gradient my-1' />
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Close date: </span>
                            <span className='text-white font-normal'>---</span>
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
        <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-8">
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