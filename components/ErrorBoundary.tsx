import { NextRouter, withRouter } from "next/router"
import React from "react"
import { SendErrorMessage } from "../lib/telegram"
import SubmitButton from "./buttons/submitButton"
import ContactSupport from "./ContactSupport"
import MessageComponent from "./MessageComponent"
import Navbar from "./navbar"
import GoHomeButton from "./utils/GoHome"
type Props = {
    router: NextRouter
}
class ErrorBoundary extends React.Component<Props, { hasError: boolean }> {
    constructor(props) {
        super(props)
        // Define a state variable to track whether is an error or not
        this.state = { hasError: false }
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        try {
            if (process.env.NEXT_PUBLIC_VERCEL_ENV != 'true') {
                SendErrorMessage("UI error", error?.message)
            }
        }
        catch (e) {
            //TODO should error be handled? and how?
        }
        return { hasError: true }
    }
    componentDidCatch(error, errorInfo) {
        // You can use your own error logging service here
        console.log({ error, errorInfo })
    }
    render() {
        // Check if the error is thrown
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className={`scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50`}>
                    <main className="scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                        <div className="min-h-screen overflow-hidden relative font-robo">
                            <Navbar />
                            <div className="mx-auto max-w-xl bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
                                <MessageComponent>
                                    <MessageComponent.Content icon="red">
                                        <MessageComponent.Header>
                                            Unable to complete the request
                                        </MessageComponent.Header>
                                        <MessageComponent.Description>
                                            <p>
                                                Sorry, but we were unable to complete this request. We are informed, and are now investigating the issue.
                                            </p>
                                            <p>
                                                Please try again. If the issue keeps happening, <span className="underline cursor-pointer text-primary "><ContactSupport>contact our support team.</ContactSupport></span>
                                            </p>
                                        </MessageComponent.Description>
                                    </MessageComponent.Content>
                                    <MessageComponent.Buttons>
                                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                                            this.setState({ hasError: false })
                                        }}>
                                            Try Again
                                        </SubmitButton>
                                        {
                                            this.props.router.asPath !== "/" && <GoHomeButton>
                                                <SubmitButton buttonStyle="outline" isDisabled={false} isSubmitting={false}>
                                                    Go home
                                                </SubmitButton>
                                            </GoHomeButton>
                                        }
                                    </MessageComponent.Buttons>
                                </MessageComponent>
                            </div>
                        </div>
                    </main>
                </div>

            )
        }

        // Return children components in case of no error
        return this.props.children
    }
}

export default withRouter(ErrorBoundary)