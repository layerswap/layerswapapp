import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import Navbar from "./Common/navbar"
import Link from "next/link";
import DiscordLogo from "./Icons/DiscordLogo";
import GitHubLogo from "./Icons/GitHubLogo";
import YoutubeLogo from "./Icons/YoutubeLogo";
import TwitterLogo from "./Icons/TwitterLogo";

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
                <div className={`top-backdrop md:block hidden`} />
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
                <div className="w-full h-full max-w-lg z-[1] sm:mb-6">
                    <div className="flex h-full content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg">
                        <div className="flex h-full flex-col w-full text-primary-text">
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

const GlobalFooter = () => {

    const footerNavigation = {
        main: [
            { name: 'Product', href: '/' },
            { name: 'Company', href: '/company' },
            { name: 'FAQ', href: '/faq' },
            { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/more-information/privacy-policy' },
            { name: 'Terms of Services', href: 'https://docs.layerswap.io/user-docs/more-information/terms-of-services' },
            { name: 'Docs', href: 'https://docs.layerswap.io/onboarding-sdk' },
        ],
        social: [
            {
                name: 'X',
                href: 'https://x.com/layerswap',
                icon: () => (
                    <TwitterLogo className="h-6 w-6" aria-hidden="true" />
                ),
            },
            {
                name: 'Discord',
                href: 'https://discord.gg/layerswap',
                icon: () => (
                    <DiscordLogo className="h-6 w-6" aria-hidden="true" />
                ),
            },
            {
                name: 'GitHub',
                href: 'https://github.com/layerswap/layerswapapp',
                icon: () => (
                    <GitHubLogo className="h-6 w-6" aria-hidden="true" />
                ),
            },
            {
                name: 'YouTube',
                href: 'https://www.youtube.com/@layerswaphq',
                icon: () => (
                    <YoutubeLogo className="h-6 w-6" aria-hidden="true" />
                ),
            },
        ],
    }

    return (
        <>
            <footer className="z-0 hidden md:block fixed bottom-0 py-4 w-full px-6 lg:px-8 mt-auto">
                <div className="flex justify-between items-center w-full px-6">
                    <div className="px-6">
                        <div className="flex mt-3 md:mt-0 gap-6">
                            <Link target="_blank" href="https://docs.layerswap.io/user-docs/more-information/privacy-policy/" className="text-xs leading-6 text-primary-text-muted underline hover:no-underline hover:text-opacity-70 duration-200 transition-all">
                                Privacy Policy
                            </Link>
                            <Link target="_blank" href="https://docs.layerswap.io/user-docs/more-information/terms-of-services/" className="text-xs leading-6 text-primary-text-muted underline hover:no-underline hover:text-opacity-70 duration-200 transition-all">
                                Terms of Services
                            </Link>
                        </div>
                        <p className="text-center text-xs text-primary-text-muted leading-6">
                            &copy; {new Date().getFullYear()} Layerswap Labs, Inc. All rights reserved.
                        </p>
                    </div>
                    <div className="flex space-x-6 px-6">
                        {footerNavigation.social.map((item) => (
                            <Link target="_blank" key={item.name} href={item.href} className="text-gray-400 hover:text-gray-500">
                                <span className="sr-only">{item.name}</span>
                                <item.icon />
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </>

    )
}