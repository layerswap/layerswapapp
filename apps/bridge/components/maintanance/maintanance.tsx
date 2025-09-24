import { useEffect } from "react";
import { useIntercom } from "react-use-intercom";
import CardContainer from "../cardContainer";
import { LayerswapLogo } from "../Icons/layerSwapLogo";
import TwitterLogo from "../Icons/TwitterLogo";

function MaintananceContent(props) {
    const { boot, update } = useIntercom()

    useEffect(() => {
        boot()
        update()
    })

    const twitterLogo = <TwitterLogo className="text-primary-text h-6 w-6" />
    return (
        <div className="flex items-stretch flex-col">
            <LayerswapLogo className="h-8 mt-4 md:hidden w-auto text-primary-logoColor fill-primary-text" />
            <CardContainer {...props} >
                <div className="flex flex-col justify-center space-y-12 p-10 text-primary-text md:min-h-fit min-h-[400px]">
                    <h1 className="text-xl tracking-tight text-gray-200">
                        <p className="mb-4 text-secondary-text">
                            We&apos;re upgrading our systems and infrastructure to give you the best experience yet.
                        </p>
                        <span className="block font-bold text-2xl xl:inline"><span>We&apos;ll be back at</span> <span>{new Date(1748448000000).toLocaleTimeString()}</span></span>
                    </h1>
                    <button onClick={() => window.open('https://twitter.com/layerswap', '_blank')} >Follow for updates</button>
                </div>
            </CardContainer>
        </div>
    );
}

export default MaintananceContent;
