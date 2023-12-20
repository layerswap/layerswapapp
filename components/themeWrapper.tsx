import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import Navbar from "./navbar"
import GlobalFooter from "./globalFooter";
import { useLoadingState } from "../context/loadingContext";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    return <div className='styled-scroll'>
        <div className="invisible light"></div>
        <main className="styled-scroll">
            <div className={`flex flex-col items-center min-h-screen overflow-hidden relative font-robo`}>
                <Toaster position="top-center" toastOptions={{
                    duration: 5000,
                    style: {
                        background: '#131E36',
                        color: '#a4afc8'
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
                <div className={`top-backdrop md:block hidden`}>

                </div>
                <div>
                    <svg
                        className="absolute inset-0 -z-10 h-full w-full stroke-secondary-500/60 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                        aria-hidden="true"
                    >
                        <defs>
                            <pattern
                                id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
                                width={200}
                                height={200}
                                x="50%"
                                y={-1}
                                patternUnits="userSpaceOnUse"
                            >
                                <path d="M.5 200V.5H200" fill="none" />
                            </pattern>
                        </defs>
                        <svg x="50%" y={-1} className="overflow-visible fill-secondary-800/60">
                            <path
                                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                                strokeWidth={0}
                            />
                        </svg>
                        <rect width="100%" height="100%" strokeWidth={0} fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)" />
                    </svg>
                </div>
                <Navbar />
                <div className="w-full">
                    <div className="z-[1] flex content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg">
                        <div className="flex flex-col w-full text-primary-text">
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

const LoadingAnimation = () => <div
    className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}
>
    <div className='text-center text-xl text-secondary-100'>
    </div>
    <div className="relative px-6">
        <div className="flex items-start">
            <div className={`flex flex-nowrap grow`}>
                <div className="w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full">
                    <div className="sm:min-h-[504px] flex flex-col justify-between">
                        <div className="relative m-auto origin-center">
                            <motion.div
                                animate={{
                                    scale: [1.2, 0.8, 1.2],
                                    filter: ['blur(0px)', 'blur(0px)', 'blur(1px)']
                                }}
                                transition={{
                                    duration: 1,
                                    ease: "easeInOut",
                                    repeat: Infinity,
                                }}
                                exit={{ opacity: 0 }}
                                className="absolute origin-center w-5 h-5 bg-primary-500/90 rounded-sm">
                            </motion.div>
                            <motion.div
                                animate={{
                                    scale: [1.2, 0.8, 1.2],
                                    filter: ['blur(0px)', 'blur(0px)', 'blur(1px)']
                                }}
                                transition={{
                                    duration: 1,
                                    ease: "easeInOut",
                                    repeat: Infinity,
                                    delay: 0.1
                                }}
                                exit={{ opacity: 0 }}
                                className="absolute origin-center left-1 top-1 w-5 h-5 bg-primary-500/60 rounded-sm">
                            </motion.div>
                            <motion.div
                                animate={{
                                    scale: [1.2, 0.8, 1.2],
                                    filter: ['blur(0px)', 'blur(0px)', 'blur(1px)']
                                }}
                                transition={{
                                    duration: 1,
                                    ease: "easeInOut",
                                    repeat: Infinity,
                                    delay: 0.2
                                }}
                                exit={{ opacity: 0 }}
                                className="absolute origin-center left-2 top-2 w-5 h-5 bg-primary-500/50 rounded-sm">
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="widget_root" />
</div>