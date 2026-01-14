import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import { TooltipProvider } from "./shadcn/tooltip";
import type { JSX } from 'react';

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    return <TooltipProvider delayDuration={400}>
        <main className="styled-scroll h-full">
            <div className={`flex flex-col items-center overflow-hidden relative font-robo h-full`}>
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
                <div className="w-full h-full sm:max-w-[472px] z-auto">
                    <div className="flex h-full w-full content-center items-center justify-center flex-col">
                        <div className="h-full w-full text-primary-text">
                            {children}
                        </div>
                    </div>
                </div>
                <div id="offset-for-stickyness" className="block md:hidden"></div>
            </div>
        </main>
    </TooltipProvider>
}