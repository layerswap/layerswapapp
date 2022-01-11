import TwitterLogo from './icons/twitterLogo';
import DiscordLogo from './icons/discordLogo';
import Link from 'next/link';
import { BookOpenIcon, PlayIcon } from '@heroicons/react/outline';
import CardContainer from './cardContainer';

function IntroCard(props) {
    return (
        <CardContainer {...props}>
            <div className="flex flex-col justify-between md:px-10">
                <div>
                    <h1 className="text-2xl font-semibold">LayerSwap</h1>
                    <p className="md:max-w-lg text-base text-gray-100 mt-2">
                        Save 10x on fees when moving crypto from Coinbase, Binance or FTX to Arbitrum, zkSync, Loopring and other L2s.
                    </p>
                    <p className="py-4">
                        <span className="bg-indigo-600 text-sm mr-1 rounded-md py-1 px-2">New</span> 
                        <span className="md:hidden">
                            Loopring!
                        </span>
                        <span className="hidden md:inline">
                            Loopring is now supported!
                        </span>
                    </p>
                </div>
                <div className="flex items-center">
                    <div className="mt-2 space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
                        <a href="https://www.loom.com/share/c853ca7e2ed04fa986e35928e8da015b" target="_blank" className="text-indigo-300 font-semibold hover:underline hover:cursor-pointer">
                            <div className="flex flex-row items-center">
                                <PlayIcon className="w-5 h-5 mr-2" />
                                <span>Watch Intro Video</span>
                            </div>
                        </a>
                        <Link key="userGuide" href="/userguide">
                            <a className="text-indigo-300 font-semibold hover:underline hover:cursor-pointer">
                                <div className="flex flex-row items-center">
                                    <BookOpenIcon className="w-5 h-5 mr-2" />
                                    <span>Read User Guide</span>
                                </div>
                            </a>
                        </Link>
                        <a href="https://twitter.com/layerswap" target="_blank" className="text-indigo-300 font-semibold hover:underline hover:cursor-pointer">
                            <div className="flex flex-row items-center">
                                <TwitterLogo className="w-5 h-5 mr-2" />
                                <span>Twitter</span>
                            </div>
                        </a>
                        <a href="https://discord.com/invite/KhwYN35sHy" target="_blank" className="text-indigo-300 font-semibold hover:underline hover:cursor-pointer">
                            <div className="flex flex-row items-center">
                                <DiscordLogo className="w-5 h-5 mr-2" />
                                <span>Discord</span>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </CardContainer>
    );
}

export default IntroCard;
