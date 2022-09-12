import { useRouter } from "next/router";
import { FC, Fragment, useCallback, useEffect, useState } from "react";
import CopyButton from "../buttons/copyButton";
import LayerSwapLogo from "../icons/layerSwapLogo";
import { PaperClipIcon } from '@heroicons/react/outline'
import { Transition } from "@headlessui/react";
import { renderToString } from 'react-dom/server'
import LayerSwapLogoSmall from "../icons/layerSwapLogoSmall";


interface Props {
    className?: string;
    children?: JSX.Element | JSX.Element[];
}

const GoHomeButton: FC<Props> = (({ className, children }) => {
    const router = useRouter()
    const [show, setShow] = useState(false)
    const handleGoHome = useCallback(() => {
        router.push({
            pathname: "/",
            query: router.query
        })
    }, [router.query])

    useEffect(() => {
        const handleClick = () => setShow(false);
        window.addEventListener('click', handleClick)
    }, [])

    return (
        <div onClick={handleGoHome}>
            {
                children ??
                <>
                    <LayerSwapLogo onContextMenu={(e) => {
                        e.preventDefault()
                        setShow(true)
                    }} className={className ?? "h-8 w-auto text-white"} />
                    {
                        <Transition
                            as={Fragment}
                            show={show}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <div className='absolute z-40 border h-fit text-pink-primary-300 border-darkblue-200 mt-2 w-fit rounded-md shadow-lg bg-darkBlue ring-1 ring-black ring-opacity-5 focus:outline-none'>
                                <button
                                    className='block px-4 py-2 text-sm text-left w-full hover:bg-darkblue-300 whitespace-nowrap'>
                                    <CopyButton toCopy={renderToString(<LayerSwapLogo />)}>Copy logo as SVG</CopyButton>
                                </button>
                                <button className='block px-4 py-2 text-sm text-left w-full hover:bg-darkblue-300 whitespace-nowrap'>
                                    <CopyButton toCopy={renderToString(<LayerSwapLogoSmall />)}>Copy symbol as SVG</CopyButton>
                                </button>
                                <hr className="horizontal-gradient" />
                                <a href="https://layerswap.notion.site/layerswap/Layerswap-brand-guide-4b579a04a4c3477cad1c28f466749cf1" target='_blank' className='flex space-x-1 items-center px-4 py-2 text-sm text-left w-full hover:bg-darkblue-300 whitespace-nowrap'>
                                    <PaperClipIcon width={16} />
                                    <p>Brand Guidelines </p>
                                </a>
                            </div>
                        </Transition>
                    }
                </>
            }
        </div>
    )
})

export default GoHomeButton;