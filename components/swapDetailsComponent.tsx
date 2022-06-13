import { useRouter } from 'next/router';
import { FC, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../context/swap';

type Props = {
    current: boolean
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
          <circle cx="30" cy="30" r="30" fill="#E43636"/>
          <path d="M20 41L40 20" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
          <path d="M20 20L40 41" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
        </svg>
      )
    } else if (status === 'confirmed') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="30" fill="#55B585"/>
          <path d="M16.5781 29.245L25.7516 38.6843L42.6308 21.3159" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
        </svg>
      )
    }
  }

const SwapDetails: FC<Props> = ({ current }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState()
    const { payment } = useSwapDataState()

    const router = useRouter();
    const { swapId } = router.query;

    const { getSwapAndPayment } = useSwapDataUpdate()

    

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-8">
                    <div className="items-center mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <div className='text-xl text-white mb-2'>Swap Details</div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Payment Number: </span>
                            <span className='text-white font-normal'>#93904</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Payment ID: </span>
                            <span className='text-white font-normal'>87194ead-0913-4fef-87ef-9514419ca903</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Create date: </span>
                            <span className='text-white font-normal'>6/10/2022 16:46:25 PM</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Merchant: </span>
                            <span className='text-white font-normal'>Layerswap</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Payment Method: </span>
                            <span className='text-white font-normal'>Coinbase</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Amount: </span>
                            <span className='text-white font-normal'>0.15 ETH</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Fee: </span>
                            <span className='text-white font-normal'>0.0028 ETH</span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Status: </span>
                            <span className='text-white font-normal'></span>
                        </div>
                        <hr className='horizontal-gradient my-1'/>
                        <div className="flex justify-between items-baseline">
                            <span className="text-left">Close date: </span>
                            <span className='text-white font-normal'>6/10/2022 12:46:25 PM</span>
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

export default SwapDetails;