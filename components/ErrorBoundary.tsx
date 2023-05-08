import { Home, RefreshCcw } from "lucide-react";
import { NextRouter, withRouter } from "next/router"
import React, { ErrorInfo } from "react";
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

        return { hasError: true }
    }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
            SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A errorInfo: ${errorInfo?.componentStack} %0A stack: ${error?.stack ?? error.stack} %0A`)
        }
    }
    render() {
        // Check if the error is thrown
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="styled-scroll">
                    <main className="styled-scroll">
                        <div className="min-h-screen overflow-hidden relative font-robo">
                            <Navbar />
                            <div className="mx-auto max-w-xl bg-darkblue-900 shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
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
                                        <div className="flex flex-row text-white text-xs sm:text-base space-x-2">
                                            <div className='basis-1/3'>
                                                {
                                                    this.props.router.asPath !== "/" && <GoHomeButton>
                                                        <SubmitButton text_align="left" buttonStyle="outline" isDisabled={false} isSubmitting={false} icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                                            Go home
                                                        </SubmitButton>
                                                    </GoHomeButton>
                                                }
                                            </div>
                                            <div className='basis-2/3'>
                                                <SubmitButton button_align="right" text_align="left" isDisabled={false} isSubmitting={false} onClick={() => {
                                                    this.setState({ hasError: false })
                                                }} icon={<RefreshCcw className="h-5 w-5" aria-hidden="true" />}>
                                                    Try Again
                                                </SubmitButton>
                                            </div>
                                        </div>
                                    </MessageComponent.Buttons>
                                </MessageComponent>
                            </div>
                            <div id="widget_root" />
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