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
                sendEvent: true
            },
            {
                name: 'Discord',
                href: 'https://discord.gg/layerswap',
                icon: () => (
                    <DiscordLogo className="h-6 w-6" aria-hidden="true" />
                ),
                sendEvent: true
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
                            <Link target="_blank" href="https://docs.layerswap.io/user-docs/more-information/privacy-policy/" className="text-xs leading-6 text-primary-text-muted underline hover:no-underline hover:text-primary-text-muted/70 duration-200 transition-all">
                                Privacy Policy
                            </Link>
                            <Link target="_blank" href="https://docs.layerswap.io/user-docs/more-information/terms-of-services/" className="text-xs leading-6 text-primary-text-muted underline hover:no-underline hover:text-primary-text-muted/70 duration-200 transition-all">
                                Terms of Services
                            </Link>
                        </div>
                        <p className="text-center text-xs text-primary-text-muted leading-6">
                            &copy; {new Date().getFullYear()} Layerswap Labs, Inc. All rights reserved.
                        </p>
                    </div>
                    <div className="flex space-x-6 px-6">
                        {footerNavigation.social.map((item) => (
                            <Link
                                target="_blank"
                                key={item.name}
                                href={item.href}
                                onClick={() => {
                                    if(item.sendEvent) {
                                        window.safary?.track({
                                            eventType: 'click',
                                            eventName: 'footer_social_click',
                                            parameters: {
                                                custom_str_1_label: 'social',
                                                custom_str_1_value: item.name,
                                            }
                                        })
                                    }
                                }}
                                className="text-gray-400 hover:text-gray-500"
                            >
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

export default GLobalFooter