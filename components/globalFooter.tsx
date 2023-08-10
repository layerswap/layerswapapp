import Link from "next/link";
import TwitterLogo from "./icons/TwitterLogo";
import DiscordLogo from "./icons/DiscordLogo";
import GitHubLogo from "./icons/GitHubLogo";
import YoutubeLogo from "./icons/YoutubeLogo";

const GLobalFooter = () => {

    const footerNavigation = {
        main: [
            { name: 'Product', href: '/' },
            { name: 'Company', href: '/company' },
            { name: 'FAQ', href: '/faq' },
            { name: 'Privacy Policy', href: 'https://docs.layerswap.io/information/privacy-policy' },
            { name: 'Terms of Services', href: 'https://docs.layerswap.io/information/terms-of-services' },
            { name: 'Docs', href: 'https://docs.layerswap.io/onboarding-sdk/' },
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

    return (
        <footer className="overflow-hidden py-6 md:grid grid-cols-3 w-full px-6 lg:px-8 mt-auto">
            <div className="flex justify-center space-x-6 order-3 place-self-end">
                {footerNavigation.social.map((item) => (
                    <Link target="_blank" key={item.name} href={item.href} className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">{item.name}</span>
                        <item.icon />
                    </Link>
                ))}
            </div>
            <div className="flex justify-center mt-3 md:mt-0 gap-6 order-2 place-self-center">
                <Link target="_blank" href="https://docs.layerswap.io/information/privacy-policy" className="text-xs leading-6 text-primary-text-muted hover:text-opacity-70 duration-200 transition-all">
                    Privacy Policy
                </Link>
                <Link target="_blank" href="https://docs.layerswap.io/information/terms-of-services" className="text-xs leading-6 text-primary-text-muted hover:text-opacity-70 duration-200 transition-all">
                    Terms of Services
                </Link>
            </div>
            <div className="mt-3 order-1 md:mt-0 place-self-start">
                <p className="text-center text-xs text-primary-text-muted leading-6">
                    &copy; {new Date().getFullYear()} Bransfer, Inc. All rights reserved.
                </p>
            </div>
        </footer>
    )
}

export default GLobalFooter