import CardContainer from './cardContainer';

function IntroCard(props) {
    return (
        <CardContainer {...props} >
            <div className="flex flex-col px-4 md:px-8 py-6 text-primary-text font-light">
                <div>
                    <h1 className="text-xl font-light text-white">About Layerswap</h1>
                    <p className="text-base mt-4">
                        Move crypto from Coinbase, Binance or Kraken to zkSync, Loopring, StarkNet and other L2s.
                    </p>
                    <p className="py-4">
                        <span className="text-sm font-semibold mr-2 rounded-md py-1 px-2 text-pink-primary border border-pink-primary uppercase">New</span>
                        <span className="hidden md:inline">
                            BNB Chain (BSC) 🤯, and a new feature<a target="_blank" className='underline text-slate-300 hover:no-underline px-1' href="https://twitter.com/layerswap/status/1593259469722423299?s=20&t=QSWDB8kg8z2-wywDemHk-w">Check the announcement</a>
                        </span>
                        <span className="inline md:hidden">
                            <a target="_blank" className='underline text-slate-300 hover:no-underline px-1' href="https://twitter.com/layerswap/status/1593259469722423299?s=20&t=QSWDB8kg8z2-wywDemHk-w">BNB Chain (BSC)</a> 🤯
                        </span>
                    </p>
                </div>

            </div>
        </CardContainer>
    );
}

export default IntroCard;
