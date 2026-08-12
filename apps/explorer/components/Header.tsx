'use client'

import LayerswapExplorerLogo from './icons/layerswapExplorer'
import Search from './Search'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Header() {
    const pathname = usePathname();
    const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH
    const version = process.env.NEXT_PUBLIC_API_VERSION
    const isHome = pathname === '/' || pathname === basePath || pathname === `${basePath}/`
    const isAnalytics = pathname === '/analytics' || pathname === `${basePath}/analytics`
    const isSearchPage = !isHome && !isAnalytics
    const internalLinkClass = (active: boolean) =>
        `rounded-lg px-2 py-1 text-sm transition-colors sm:px-3 sm:py-2 sm:text-base ${active
            ? 'bg-secondary-300 text-primary-text'
            : 'text-secondary-text hover:bg-secondary-500 hover:text-primary-text'
        }`

    return (
        <header className="max-w-6xl w-full mx-auto relative z-20">
            {
                version === 'sandbox' &&
                <div className='px-6 lg:px-8'>
                    <div className="h-0.5 rounded-full bg-warning-foreground" />
                    <div className="absolute -top-0.5 right-[calc(50%-68px)] rounded-b-md bg-warning-foreground px-10 py-0.5 text-xs text-secondary-900 scale-75">
                        TESTNET
                    </div>
                </div>
            }
            <nav className={`mx-auto max-w-6xl pt-6 px-6 lg:px-8 flex flex-col ${pathname !== '/' ? 'grid-rows-2' : 'grid-rows-1'}`} aria-label="Global">
                <div className='flex justify-between'>
                    <Link href="/" className="-m-1.5 p-1.5">
                        <LayerswapExplorerLogo className="h-10 w-auto text-primary-logoColor sm:h-14" />
                    </Link>
                    <div className="flex items-center gap-0.5">
                        <Link
                            href="/"
                            aria-current={isHome ? 'page' : undefined}
                            className={`${internalLinkClass(isHome)} hidden sm:block`}
                        >
                            Transfers
                        </Link>
                        {/* <Link
                            href="/analytics"
                            aria-current={isAnalytics ? 'page' : undefined}
                            className={internalLinkClass(isAnalytics)}
                        >
                            Analytics
                        </Link> */}
                        <span className="mx-1 hidden h-5 w-px bg-secondary-300 sm:block" aria-hidden="true" />
                        <Link target='_blank' href={'https://layerswap.io/'} className='flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-secondary-text transition-colors hover:bg-secondary-500 hover:text-primary-text sm:px-3 sm:py-2 sm:text-base'>
                            <span>App</span>
                        </Link>
                        <Link target='_blank' href={'https://docs.layerswap.io/'} className='hidden items-center gap-1 rounded-lg px-2 py-1 text-sm text-secondary-text transition-colors hover:bg-secondary-500 hover:text-primary-text sm:flex sm:px-3 sm:py-2 sm:text-base'>
                            <span>Docs</span>
                        </Link>
                    </div>
                </div>
                <div className='w-full'>
                    {isSearchPage &&
                        <Search />
                    }
                </div>
            </nav>
        </header >
    )
}
