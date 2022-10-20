import React from "react"


class ErrorBoundary extends React.Component<{}, { hasError: boolean }> {
    constructor(props) {
        super(props)
        // Define a state variable to track whether is an error or not
        this.state = { hasError: true }
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI

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
                            <div className="content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
                                <div className='flex flex-col space-y-5 animate-fade-in'>
                                    <div className={`pb-6 bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative `}>
                                        <div>
                                            <h2>Oops, there is an error!</h2>
                                            <button
                                                type="button"
                                                onClick={() => this.setState({ hasError: false })}
                                            >
                                                Try again?
                                            </button>
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

export default ErrorBoundary