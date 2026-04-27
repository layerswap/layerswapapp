import { useEffect } from "react";
import { useIntercom } from "react-use-intercom";
import LayerswapLogo from "../Icons/layerSwapLogo";
import TwitterLogo from "../Icons/TwitterLogo";
import { SubmitButton } from "@layerswap/widget/internal";

function MaintananceContent() {
    const { boot, update } = useIntercom()

    useEffect(() => {
        boot()
        update()
    })

    const twitterLogo = <TwitterLogo className="text-primary-buttonTextColor h-5 w-5" />
    return (
        <div className="flex items-center justify-center h-[80svh] px-4">
            <div className="flex flex-col items-center text-center max-w-md w-full space-y-8">
                <LayerswapLogo className="h-10 w-auto text-primary-logoColor fill-primary-text" />

                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-secondary-500 px-4 py-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500" />
                        </span>
                        <span className="text-sm font-medium text-secondary-text">{"Maintenance in progress"}</span>
                    </div>

                    <h1 className="text-3xl font-bold text-primary-text tracking-tight">
                        {"We'll be back soon!"}
                    </h1>
                    <p className="text-secondary-text text-base leading-relaxed">
                        {"We're upgrading our systems and infrastructure to give you the best experience yet."}
                    </p>
                </div>

                <div className="w-full max-w-xs">
                    <SubmitButton
                        onClick={() => window.open('https://twitter.com/layerswap', '_blank')}
                        icon={twitterLogo}
                        isDisabled={false}
                        isSubmitting={false}
                    >
                        {"Follow for updates"}
                    </SubmitButton>
                </div>
            </div>
        </div>
    );
}

export default MaintananceContent;
