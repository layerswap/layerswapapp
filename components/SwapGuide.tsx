import Image from 'next/image'
import firstGuidePic from './../public/images/withdrawGuideImages/01.png'
import secondNetworkGuidePic from './../public/images/withdrawGuideImages/02Network.png'
import secondExchangeGuideGuidePic from './../public/images/withdrawGuideImages/02Exchange.png'
import thirdGuidePic from './../public/images/withdrawGuideImages/03.png'
import { MappedSwapItem, SwapItem } from '../lib/layerSwapApiClient'

const SwapGuide = ({ swap }: { swap: MappedSwapItem }) => {
    return (
        <div className='rounded-md w-full flex flex-col items-left justify-center space-y-4 text-left text-secondary-text'>
            <p className='text-secondary-text'><span>To complete the swap,&nbsp;</span><strong>manually send</strong><span>&nbsp;assets from your wallet, to the&nbsp;</span><strong>Deposit Address</strong><span>&nbsp;generated by Layerswap.</span></p>
            <div className='space-y-3'>
                <p className='text-base font-semibold text-primary-text'>🪜 Steps</p>
                <div className='space-y-5 text-base text-secondary-text'>
                    <div className='space-y-3'>
                        <p><span className='text-primary'>.01</span><span>&nbsp;Copy the Deposit Address, or scan the QR code</span></p>
                        <div className='border-2 border-secondary-400 rounded-xl p-2 bg-secondary-500'>
                            <Image src={firstGuidePic} className='w-full rounded-xl' alt={''} />
                        </div>
                    </div>
                    <div className='space-y-3'>
                        <p><span className='text-primary'>.02</span><span>&nbsp;Send&nbsp;</span><span className='text-primary-text'>{swap?.destination_network_asset?.asset}</span><span>&nbsp;to that address from your&nbsp;</span><span>{swap?.source_exchange ? 'exchange account' : 'wallet'}</span></p>
                        <div className='border-2 border-secondary-400 rounded-xl p-2 bg-secondary-500'>
                            <Image src={swap?.source_exchange ? secondExchangeGuideGuidePic : secondNetworkGuidePic} className='w-full rounded-xl' alt={''} />
                        </div>
                    </div>
                    {swap?.source_exchange && <div className='space-y-3'>
                        <p><span className='text-primary'>.03</span><span>&nbsp;Make sure to send via one of the supported networks</span></p>
                        <div className='border-2 border-secondary-400 rounded-xl p-2 bg-secondary-500'>
                            <Image src={thirdGuidePic} className='w-full rounded-xl' alt={''} />
                        </div>
                    </div>}
                </div>
            </div>

        </div>
    )
}

export default SwapGuide