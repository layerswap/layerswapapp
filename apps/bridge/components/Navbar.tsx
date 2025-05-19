import React from 'react'
import LayerSwapLogo from './Icons/layerSwapLogo'

export default function Navbar() {

    return (
        <div className='mt-12 mb-8 mx-auto px-4 overflow-hidden hidden md:block'>
            <div className="flex justify-center">
                <LayerSwapLogo className="h-11 w-auto text-primary-logoColor fill-primary-text cursor-pointer headerLogo" />
            </div>
        </div>
    )
}