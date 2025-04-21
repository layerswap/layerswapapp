import { FC, useEffect, useState } from "react";
import MessageComponent from "../../Common/MessageComponent";
import inIframe from "../../utils/inIframe";

export const NoCookies: FC = () => {

    const [embedded, setEmbedded] = useState<boolean>()

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    return (
        <div className={`flex flex-col items-center min-h-screen overflow-hidden relative font-robo`}>
            <div className="w-full max-w-lg z-[1]">
                <div className="flex content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg">
                    <div className="flex flex-col w-full text-primary-text">
                        <div className="styled-scroll">
                            <div className="min-h-screen overflow-hidden relative font-robo">
                                <div className="mx-auto max-w-xl bg-secondary-900 shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
                                    <MessageComponent>
                                        <MessageComponent.Content icon="red">
                                            <MessageComponent.Header>
                                                Sorry
                                            </MessageComponent.Header>
                                            <MessageComponent.Description>
                                                <div className="text-secondary-text space-y-5 text-left">
                                                    <div className="space-y-2">
                                                        <p className="text-primary-text">
                                                            It seems like you’ve either:
                                                        </p>
                                                        <ul className="text-secondary-text list-disc ml-4 mt-0 ">
                                                            <li>Disabled cookies</li>
                                                            <li>Or using Layerswap in a partner’s page in Incognito mode</li>
                                                        </ul>
                                                    </div>
                                                    <p className="text-secondary-text">Unforunately, we can’t run in those conditions 🙁</p>
                                                </div>
                                                {
                                                    embedded &&
                                                    <a target="_blank" href={window?.location?.href} className="bg-primary text-primary-actionButtonText py-3 px-3 border border-primary disabled:border-primary-900 shadowed-button items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-200 ease-in-out">
                                                        Try on Layerswap
                                                    </a>
                                                }
                                            </MessageComponent.Description>
                                        </MessageComponent.Content>
                                    </MessageComponent>
                                </div>
                            </div>
                        </div >
                    </div>
                </div>
            </div>
        </div>
    )
}