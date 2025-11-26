import { Home } from "lucide-react"
import { useCallback, useEffect } from "react"
import MessageComponent from "../components/MessageComponent"
import Navbar from "../components/navbar"
import GoHomeButton from "../components/utils/GoHome"
import { posthog } from "posthog-js"
import NotFoundIcon from "@/components/icons/NotFoundIcon"
import { useIntercom } from "react-use-intercom"

export default function Custom404() {
    useEffect(() => {
        posthog.capture("404", {
            name: "404",
            path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
    }, []);

    const { boot, show } = useIntercom()

    const startIntercom = useCallback(() => {
        boot();
        show();
    }, [boot, show])

    return (
        <main className="styled-scroll max-sm:bg-secondary-700">
            <div className="min-h-screen overflow-hidden relative font-robo">
                <Navbar />
                <div className="mx-auto sm:max-w-md bg-secondary-700 rounded-3xl w-full overflow-hidden relative p-4 sm:h-[500px] sm:min-h-[550px] h-[90svh]">
                    <MessageComponent>
                        <MessageComponent.Content center>
                            <MessageComponent.Header className="mb-3">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-background">
                                    <NotFoundIcon className="text-error-foreground" />
                                </div>
                                <h1 className="text-center text-2xl font-semibold text-primary-text">
                                    Page not found
                                </h1>
                            </MessageComponent.Header>
                            <MessageComponent.Description>
                                <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                    <span>We couldn&#39;t find a page with this link. If you believe there&#39;s an issue, please</span>
                                    <button
                                        type="button"
                                        onClick={startIntercom}
                                        className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1420] focus:ring-gray-400 rounded"
                                    >
                                        <span>contact our support</span>
                                    </button>
                                    <span>and we&#39;ll help you fix it.</span>
                                </p>
                            </MessageComponent.Description>
                        </MessageComponent.Content>
                        <MessageComponent.Buttons>
                            <GoHomeButton>
                                <div className="flex w-full text-primary-text text-base space-x-2">
                                    <button
                                        type="button"
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-300 px-5 py-4 text-base font-semibold leading-6 hover:bg-secondary-400 focus:outline-none transition"
                                    >
                                        <Home className="h-5 w-5" aria-hidden="true" />
                                        <span>Back to app</span>
                                    </button>
                                </div>
                            </GoHomeButton>
                        </MessageComponent.Buttons>
                    </MessageComponent>
                </div>
            </div>
        </main>
    )
}