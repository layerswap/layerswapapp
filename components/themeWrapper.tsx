import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast"
import { useQueryState } from "../context/query"
import FooterComponent from "./footerComponent"
import Navbar from "./navbar"

type Props = {
    hideFooter: boolean,
    hideNavbar: boolean,
    children: JSX.Element | JSX.Element[]
}
export default function ({ hideNavbar, hideFooter, children }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const query = useQueryState()

    if(query?.partnerName?.toLowerCase() == 'immutablex') hideFooter = true

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
    const { partnerName } = useQueryState()
    return <div className={` ${partnerName} scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50`}>
        <div className="invisible immutablex"></div>
        <main className="scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
            <div className="min-h-screen overflow-hidden relative font-robo">
                <Toaster position="top-center" toastOptions={{ duration: 5000, style: { background: '#131E36', color: '#a4afc8' }, error: { position: 'top-center' } }} />
                <div className={`top-backdrop md:visible invisible`}></div>

                {hideNavbar ?? <Navbar />}
                <div className={loading ? "animate-pulse" : ""}>
                    <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col container mx-auto sm:px-6 lg:px-8 max-w-2xl wide-page:max-w-max">
                        <div className="flex flex-col w-full text-white animate-fade-in">
                            {children}
                        </div>
                    </div>
                </div>
                {hideFooter ?? <FooterComponent />}
            </div>
        </main>
    </div>
}