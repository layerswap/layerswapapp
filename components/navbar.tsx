import React, { Fragment } from 'react'
import { Popover, Transition } from '@headlessui/react'
import { MenuIcon, XIcon } from '@heroicons/react/outline'
import Link from 'next/link'
import { useRouter } from 'next/router'
import LayerSwapLogo from './icons/layerSwapLogo'
import LayerSwapLogoSmall from './icons/layerSwapLogoSmall'

const navigation = [
    { name: 'Swap', href: '/' },
    { name: 'Guide', href: '/userguide' },
    { name: 'About', href: '/about' },
]

export default function Navbar() {
    const router = useRouter();
    return (
        <div className='my-8 mx-auto px-4 overflow-hidden'>
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

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}