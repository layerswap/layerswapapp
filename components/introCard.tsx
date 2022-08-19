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
                            Transfer from Loopring to Coinbase and Binance (  🥳  off-ramp)
                        </span>
                    </p>
                </div>

            </div>
        </CardContainer>
    );
}

export default IntroCard;
