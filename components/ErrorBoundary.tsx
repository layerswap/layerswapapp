import { NextRouter, withRouter } from "next/router"
import React from "react"
import { SendErrorMessage } from "../lib/telegram"
import SubmitButton from "./buttons/submitButton"
import ContactSupport from "./ContactSupport"
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
                            <div className="content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
                                <div className='flex flex-col space-y-5 animate-fade-in'>
                                    <div className={`pb-6 bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative `}>
                                        <div className='flex flex-col items-stretch min-h-[500px] text-primary-text'>
                                            <div className="w-full px-6 md:px-8 pt-4 flex-col flex-1 flex">
                                                <div>
                                                    <div className="w-full px-6 md:px-8 py-12 grid grid-flow-row space-y-7">
                                                        <div className='flex place-content-center mb-6 md:mb-4'>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                                                                <circle cx="58" cy="58" r="58" fill="#E43636" fillOpacity="0.1" />
                                                                <circle cx="58" cy="58" r="45" fill="#E43636" fillOpacity="0.5" />
                                                                <circle cx="58" cy="58" r="30" fill="#E43636" />
                                                                <path d="M48 69L68 48" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                                                                <path d="M48 48L68 69" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
                                                            </svg>
                                                        </div>
                                                        <p className='mb-12 mt-2 pt-2 md:text-2xl text-lg font-bold text-white leading-6 text-center font-roboto'>
                                                            Unable to complete the request
                                                        </p>
                                                        <div className="mb-12 text-md font-medium space-y-6">

                                                            <p>
                                                                Sorry, but we were unable to complete this request. We are informed, and are now investigating the issue.
                                                            </p>
                                                            <p>
                                                                Please try again. If the issue keeps happening, <span className="underline cursor-pointer text-primary "><ContactSupport>contact our support team.</ContactSupport></span>
                                                            </p>
                                                        </div>
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
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
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