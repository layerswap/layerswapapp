import { useEffect, useState } from "react";
import MessageComponent from "./MessageComponent";
import inIframe from "./utils/inIframe";
import Link from "next/link";

function NoCookies(props) {
    const [embedded, setEmbedded] = useState<boolean>()

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    return (
        <div className="styled-scroll">
            <div className="min-h-screen overflow-hidden relative font-robo">
                <div className="mx-auto max-w-xl bg-secondary-700 shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
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
                                    <Link target="_blank" href={window?.location?.href} className="bg-primary text-primary-buttonTextColor py-3 px-3 border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-primary/40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-200 ease-in-out">
                                        Try on Layerswap
                                    </Link>
                                }
                            </MessageComponent.Description>
                        </MessageComponent.Content>
                    </MessageComponent>
                </div>
            </div>
        </div >
    );
}

export default NoCookies;
