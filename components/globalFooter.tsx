import Link from "next/link";
import TwitterLogo from "./icons/TwitterLogo";
import DiscordLogo from "./icons/DiscordLogo";
import GitHubLogo from "./icons/GitHubLogo";
import YoutubeLogo from "./icons/YoutubeLogo";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const GLobalFooter = () => {

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
                name: 'Twitter',
                href: 'https://twitter.com/layerswap',
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

    const version = process.env.NEXT_PUBLIC_API_VERSION
    const isMaintenance = process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true'

    return (
        <>
            <footer className="z-0 hidden md:block fixed bottom-0 py-4 w-full px-6 lg:px-8 mt-auto">
                {version === 'sandbox' && <TestnetNewsComponent />}
                <div className=" flex justify-between items-center w-full">
                    <div>
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
                    <div className="flex space-x-6">
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

const TestnetNewsComponent = () => {
    return <div className='bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative mb-5 max-w-sm text-secondary-text'>
        <div className="overflow-hidden h-1 flex rounded-t-lg bg-secondary-500" />
        <div className="w-full text-left text-base font-light p-6">
            <div className='flex items-center justify-between'>
                <p className='text-xl text-primary-text'>
                    Try v8
                </p>
            </div>
            <div className='mt-2 text-left text-secondary-text'>
                <span>Transfers to</span>
                <div className={`h-3.5 w-3.5 inline-flex flex-shrink-0 relative mx-1`}>
                    <Image
                        src={'https://devlslayerswapbridgesa.blob.core.windows.net/layerswap/networks/soneium_testnet.png'}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain"
                    />
                </div>
                <span className="text-primary-text">Soneium Minato and 8+ other chains</span> <span>are now available in Layerswap v8</span>
            </div>
            <Link href='https://layerswap.io/v8' target="_blank" className="flex items-center gap-1 underline hover:no-underline">
                <p>
                    layerswap.io/v8
                </p>
                <ArrowRight className='h-4 w-4 text-secondary-text' />
            </Link>
        </div>
    </div>
}

export default GLobalFooter
