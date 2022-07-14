import CardContainer from './cardContainer';

function IntroCard(props) {
    return (
        <CardContainer {...props} >
            <div className="flex flex-col px-4 md:px-8 py-6 text-pink-primary-300 font-light">
                <div>
                    <h1 className="text-xl font-light text-white">About Layerswap</h1>
                    <p className="text-base mt-4">
                        Save up to 10x on fees when moving crypto from Coinbase, Binance or FTX to Arbitrum, zkSync, Loopring and other L2s.
                    </p>
                    <p className="py-4">
                        <span className="text-sm font-semibold mr-2 rounded-md py-1 px-2 text-pink-primary border border-pink-primary uppercase">New</span>

                        <span className="inline">
                            Everything is new 😅 <a target='_blank' className='underline hover:no-underline' href='https://twitter.com/layerswap/status/1547707319202373640'>Learn more</a>
                            {/* <a className='underline text-indigo-300' target="_blank" href="https://twitter.com/layerswap/status/1480921959252774918">Join the discussion</a> */}
                        </span>
                    </p>
                </div>

            </div>
        </CardContainer>
    );
}

export default IntroCard;
