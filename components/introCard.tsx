import SupportIcon from './icons/supportIcon';
import Link from 'next/link';
import { BookOpenIcon } from '@heroicons/react/outline';
import CardContainer from './cardContainer';

function IntroCard(props) {
    return (
        <CardContainer {...props} >
            <div className="flex flex-col px-6 md:px-12 py-10">
                <div>
                    <h1 className="text-xl font-semibold">About Layerswap</h1>
                    <p className="text-base text-gray-100 mt-6">
                        Save up to 10x on fees when moving crypto from Coinbase, Binance or FTX to Arbitrum, zkSync, Loopring and other L2s.
                    </p>
                    <p className="py-4">
                        <span className="bg-indigo-600 text-sm mr-2 rounded-md py-1 px-2">New</span>
                        <span className="md:hidden">
                            StarkNet!
                        </span>
                        <span className="hidden md:inline">
                            StarkNet Mainnet integration is here!   
                            <> </>
                             <a className='underline text-indigo-300' target="_blank" href="https://twitter.com/layerswap/status/1532773817868865538"> Join the discussion</a>
                        </span>
                    </p>
                </div>
                <div className="flex items-center">
                    <div className="mt-2 space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
                        <Link key="userGuide" href="/userguide">
                            <a className="text-indigo-300 font-semibold hover:underline hover:cursor-pointer">
                                <div className="flex flex-row items-center">
                                    <BookOpenIcon className="w-5 h-5 mr-2" />
                                    <span>Read User Guide</span>
                                </div>
                            </a>
                        </Link>
                        <a href="https://discord.gg/PeqHAqzxQX" target="_blank" className="text-indigo-300 font-semibold hover:underline hover:cursor-pointer">
                            <div className="flex flex-row items-center">
                                <SupportIcon className="w-5 h-5" />
                                <span className='ml-2'>Get Support</span>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </CardContainer>
    );
}

export default IntroCard;
