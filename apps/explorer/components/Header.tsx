'use client'

import LayerswapExplorerLogo from './icons/layerswapExplorer'
import Search from './Search'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Header() {
    const pathname = usePathname();
    const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH
    const version = process.env.NEXT_PUBLIC_API_VERSION
    return (
        <header className="max-w-6xl w-full mx-auto relative z-20">
            {
                version === 'sandbox' &&
                <div className='px-6 lg:px-8'>
                    <div className="h-0.5 bg-[#D95E1B] rounded-full " />
                    <div className="absolute -top-0.5 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75 text-white">
                        TESTNET
                    </div>
                </div>
            }
            <nav className={`mx-auto max-w-6xl pt-6 px-6 lg:px-8 flex flex-col ${pathname !== '/' ? 'grid-rows-2' : 'grid-rows-1'}`} aria-label="Global">
                <div className='flex justify-between'>
                    <Link href="/" className="-m-1.5 p-1.5">
                        <LayerswapExplorerLogo className="h-14 w-auto text-primary-logoColor" />
                    </Link>
                    <div className="flex">
                        <Link target='_blank' href={'https://layerswap.io/'} className='px-2 sm:px-3 py-1 sm:py-2 hover:opacity-70 flex items-center gap-1 text-white text-sm sm:text-base transition-all duartion-200'>
                            <span>App</span>
                        </Link>
                        <Link target='_blank' href={'https://docs.layerswap.io/'} className='px-2 sm:px-3 py-1 sm:py-2 hover:opacity-70 flex items-center gap-1 text-white text-sm sm:text-base transition-all duartion-200'>
                            <span>Docs</span>
                        </Link>
                    </div>
                </div>
                <div className='w-full'>
                    {!(pathname === '/' || pathname === basePath || pathname === `${basePath}/`) &&
                        <Search />
                    }
                </div>
            </nav>
        </header >
    )
}