import React, { useCallback } from 'react'
import LayerSwapLogo from './icons/layerSwapLogo'
import { useRouter } from 'next/router';

export default function Navbar() {
    const router = useRouter();

    const handleGoHome = useCallback(() => {
        router.push({
            pathname: "/",
            query: router.query
        }, "/", { shallow: false })
    }, [router.query])

    return (
        <div className='mt-12 mb-8 mx-auto px-4 overflow-hidden hidden md:block'>
            <div className="flex justify-center">
                <a onClick={handleGoHome}>
                    <LayerSwapLogo className="h-11 w-auto text-white cursor-pointer" />
                </a>
            </div>
        </div>
    )
}