import { useEffect, useState } from "react";
import MessageComponent from "./MessageComponent";
import Navbar from "./navbar";
import inIframe from "./utils/inIframe";

function NoCookies(props) {
    const [embedded, setEmbedded] = useState<boolean>()

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    return (
        <div className="styled-scroll">
            <main className="styled-scroll">
                <div className="min-h-screen overflow-hidden relative font-robo">
                    <Navbar />
                    <div className="mx-auto max-w-xl bg-secondary-900 shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
                        <MessageComponent>
                            <MessageComponent.Content icon="red">
                                <MessageComponent.Header>
                                    🍪 No cookies
                                </MessageComponent.Header>
                                <MessageComponent.Description>
                                    <p>
                                        Sorry, but it seems you have disabled cookies.
                                    </p>
                                    {
                                        embedded === true &&
                                        <a href="https://layerswap.io/" className="bg-primary text-primary-buttonTextColor py-3 px-3 border border-primary disabled:border-primary-900 shadowed-button items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-200 ease-in-out">
                                            Try on Layerswap
                                        </a>
                                    }
                                    {
                                        embedded === false &&
                                        <p>
                                            Please enable cookies in your browser and try again.
                                        </p>
                                    }
                                </MessageComponent.Description>
                            </MessageComponent.Content>
                        </MessageComponent>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default NoCookies;
