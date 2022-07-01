import React from 'react'
import Link from 'next/link'
import LayerSwapLogo from './icons/layerSwapLogo'

export default function Navbar() {
    return (
        <div className='mt-12 mb-8 mx-auto px-4 overflow-hidden hidden md:block'>
            <div className="flex justify-center">
                <Link href="/" key="Home">
                    <a>
                        <LayerSwapLogo className="h-11 w-auto text-white" />
                    </a>
                </Link>
            </div>
        </div>
    )
}