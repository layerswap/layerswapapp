import React from 'react'
import LayerSwapLogo from './icons/layerSwapLogo'
import handleGoHome from './utils/GoHome';

export default function Navbar() {

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