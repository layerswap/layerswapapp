import { Home } from "lucide-react"
import { useEffect } from "react"
import MessageComponent from "../components/MessageComponent"
import Navbar from "../components/navbar"
import GoHomeButton from "../components/utils/GoHome"
import { posthog } from "posthog-js"
import NotFoundIcon from "@/components/icons/NotFoundIcon"

export default function Custom404() {
    useEffect(() => {
        posthog.capture("404", {
            name: "404",
            path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
    }, []);

    return (
        <div className="styled-scroll">
            <main className="styled-scroll">
                <div className="min-h-screen overflow-hidden relative font-robo">
                    <Navbar />
                    <div className="mx-auto max-w-lg bg-secondary-700 shadow-card rounded-lg w-full overflow-hidden relative px-6 pt-6 pb-2 h-[500px] min-h-[550px]">
                        <MessageComponent>
                            <MessageComponent.Content center>
                                <MessageComponent.Header className="mb-3">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
                                        <NotFoundIcon />
                                    </div>
                                    <h1 className="text-center text-2xl font-semibold text-white">
                                        Page not found.
                                    </h1>
                                </MessageComponent.Header>
                                <MessageComponent.Description>
                                    <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                        <span>Sorry, we couldn&apos;t find the page you&apos;re looking for.</span>
                                    </p>
                                </MessageComponent.Description>
                            </MessageComponent.Content>
                            <MessageComponent.Buttons>
                                <div className="flex flex-col w-full text-primary-text text-base space-y-2">
                                    <GoHomeButton>
                                        <button
                                            type="button"
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-300 px-5 py-3 text-base font-semibold leading-6 hover:bg-secondary-400 focus:outline-none transition"
                                        >
                                            <Home className="h-5 w-5" aria-hidden="true" />
                                            <span>Back to app</span>
                                        </button>
                                    </GoHomeButton>
                                </div>
                            </MessageComponent.Buttons>
                        </MessageComponent>
                    </div>
                </div>
            </main>
        </div>
    )
}