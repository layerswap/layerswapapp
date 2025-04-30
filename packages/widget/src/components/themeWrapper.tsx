import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    return <div className='styled-scroll'>
        <main className="styled-scroll">
            <div className={`flex flex-col items-center overflow-hidden relative font-robo`}>
                <Toaster
                    containerStyle={{
                        position: 'absolute',
                    }}
                    toastOptions={{
                        duration: 5000,
                        style: {
                            background: '#131E36',
                            color: '#a4afc8'
                        },
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
                <div className="w-full h-full max-w-lg z-[1] sm:mb-6">
                    <div className="flex h-full content-center items-center justify-center space-y-5 flex-col container mx-auto max-w-lg">
                        <div className="flex h-full flex-col w-full text-primary-text">
                            {children}
                        </div>
                    </div>
                </div>
                <div id="offset-for-stickyness" className="block md:hidden"></div>
            </div>
        </main>
    </div>
}