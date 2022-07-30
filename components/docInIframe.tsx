import { useEffect, useState } from "react"
import IframeResizer from 'iframe-resizer-react';
import SubmitButton from "./buttons/submitButton";
import { ExternalLinkIcon } from "@heroicons/react/outline";

type Props = {
    URl: string;
    onConfirm?: () => void
}
function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
export function DocIframe({ URl, onConfirm }: Props) {
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        setTimeout(() => {
            setLoading(false)
        }, 2000);
    }, [])

    return <>
        <div className="text-white text-base scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
            <div className={`relative ${loading ? '' : 'pb-96'} scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50`}>
                {
                    loading && <Sceleton />
                }
                <iframe src={URl} className={`${loading ? 'invisible h-0 w-0' : 'visible animate-fade-in-down'} scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50 border-0 self-center absolute w-full h-full`}></iframe>

            </div>
        </div>
        {
            !loading &&
            <>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="shadowed-button text-white mt-3 group disabled:white disabled:bg-pink-primary-600 disabled:cursor-not-allowed bg-pink-primary relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none shadow-md"
                >
                    Got it
                </button>
                <a
                    target="_blank"
                    href={URl}
                    onClick={onConfirm}
                    className="shadowed-button flex justify-center items-center mt-3 group disabled:white disabled:bg-pink-primary-600 disabled:cursor-not-allowed text-pink-primary relative w-full font-semibold focus:outline-none"
                >
                    View in new tab
                    <ExternalLinkIcon className='ml-2 h-5 w-5' />
                </a>
            </>
        }
    </>
}

const Sceleton = () => {
    return <div className="shadow rounded-md w-full mx-auto px-8">
        <div className="animate-pulse flex space-x-4">
            <div className="flex-1 items-center space-y-6 py-1 content-start">
                <div className="h-4 mx-auto w-1/2 place-self-center justify-self-center self-center bg-slate-700 rounded mb-4"></div>
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded"></div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="h-2 bg-slate-700 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded"></div>

                </div>
            </div>
        </div>
    </div>
}