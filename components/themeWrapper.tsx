import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import Navbar from "./navbar"
import GlobalFooter from "./globalFooter";

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    return <div className='styled-scroll'>
        <div className="invisible light" />
        <main className="styled-scroll">
            <div className={`flex flex-col items-center min-h-screen overflow-hidden relative font-robo`}>
                <Toaster position="top-center" toastOptions={{
                    duration: 5000,
                    style: {
                        background: 'rgb(var(--ls-colors-secondary-600))',
                        color: 'rgb(var(--ls-colors-secondary-text))'
                    },
                    position: 'top-center',


                    error: {
                        duration: Infinity,
                    },
                }}
                >
                    {(t) => (
                        <ToastBar toast={t}>
                            {({ icon, message }) => (
                                <>
                                    {icon}
                                    {message}
                                    {t.type !== 'loading' && (
                                        <button type="button" onClick={() => toast.dismiss(t.id)}><X className="h-5" /></button>
                                    )}
                                </>
                            )}
                        </ToastBar>
                    )}
                </Toaster>
                <Navbar />
                <div className="w-full h-full max-w-lg z-[1] sm:mb-6">
                    <div className="flex h-full content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-5 max-w-lg">
                        <div className="h-full w-full text-primary-text">
                            {children}
                        </div>
                    </div>
                </div>
                <div id="offset-for-stickyness" className="block md:hidden"></div>
                <GlobalFooter />
            </div>
        </main>
    </div>
}