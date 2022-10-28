import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast"
import { useQueryState } from "../context/query"
import FooterComponent from "./footerComponent"
import Navbar from "./navbar"
import inIframe from "./utils/inIframe";

type Props = {
    hideNavbar: boolean,
    children: JSX.Element | JSX.Element[]
}
export default function ({ hideNavbar, children }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const query = useQueryState()

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
        <div className="invisible immutablex"></div>
        <main className="styled-scroll">
            <div className="min-h-screen overflow-hidden relative font-robo">
                <Toaster position="top-center" toastOptions={{ duration: 5000, style: { background: '#131E36', color: '#a4afc8' }, error: { position: 'top-center' } }} />
                <div className={`top-backdrop md:block hidden`}></div>
                {hideNavbar ?? <Navbar />}
                <div className={loading ? "animate-pulse" : ""}>
                <div className="flex content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 lg:px-8 max-w-2xl wide-page:max-w-max">
                        <div className="flex flex-col w-full text-white animate-fade-in">
                            {children}
                        </div>
                    </div>
                </div>
                {!inIframe() && <FooterComponent />}
            </div>
        </main>
    </div>
}