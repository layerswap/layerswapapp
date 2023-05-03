import { X } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import { useQueryState } from "../context/query"
import Navbar from "./navbar"

type Props = {
    hideNavbar: boolean,
    children: JSX.Element | JSX.Element[]
}
export default function ({ hideNavbar, children }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = (url) => (url !== router.asPath) && setLoading(true);
        const handleComplete = (url) => (url === router.asPath) && setLoading(false);

        router.events.on('routeChangeStart', handleStart)
        router.events.on('routeChangeComplete', handleComplete)
        router.events.on('routeChangeError', handleComplete)

        return () => {
            router.events.off('routeChangeStart', handleStart)
            router.events.off('routeChangeComplete', handleComplete)
            router.events.off('routeChangeError', handleComplete)
        }
    })

    const { addressSource } = useQueryState()
    return <div className={` ${addressSource} styled-scroll`}>
        <div className="invisible imxMarketplace"></div>
        <main className="styled-scroll">
            <div className="min-h-screen overflow-hidden relative font-robo">
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
                                        <button onClick={() => toast.dismiss(t.id)}><X className="h-5" /></button>
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
                        className="absolute inset-0 -z-10 h-full w-full stroke-white/5 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
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
                        <svg x="50%" y={-1} className="overflow-visible fill-gray-800/20">
                            <path
                                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                                strokeWidth={0}
                            />
                        </svg>
                        <rect width="100%" height="100%" strokeWidth={0} fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)" />
                    </svg>
                </div>
                {hideNavbar ?? <Navbar />}
                <div className={loading ? "animate-pulse" : ""}>
                    <div className="flex content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg">
                        <div className="flex flex-col w-full text-white">
                            {children}
                        </div>
                    </div>
                </div>
                <div id="offset-for-stickyness"></div>
            </div>
        </main>
    </div>
}