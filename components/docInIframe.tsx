import { useEffect, useState } from "react"
import { ExternalLinkIcon } from "@heroicons/react/outline";
import { DocInFrameSceleton } from "./Sceletons";
import SubmitButton from "./buttons/submitButton";

type Props = {
    URl: string;
    onConfirm?: () => void
}
export function DocIframe({ URl, onConfirm }: Props) {
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        setTimeout(() => {
            setLoading(false)
        }, 2000);
    }, [])

    return (
        <div className="flex flex-col justify-between">
            <div className="text-white text-base scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50 mb-4 h-full">
                <div className={`relative ${loading ? '' : 'pb-96'} scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50 h-full`}>
                    {
                        loading && <DocInFrameSceleton />
                    }
                    <iframe src={URl} className={`${loading ? 'invisible h-0 w-0' : 'visible animate-fade-in-down'} scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50 border-0 self-center absolute w-full h-full rounded-md`}></iframe>

                </div>
            </div>
            {
                !loading &&
                <div>
                    <SubmitButton
                        type="button"
                        onClick={onConfirm}
                        size={'medium'}
                        isDisabled={false}
                        isSubmitting={false}
                    >
                        Got it
                    </SubmitButton>
                    <a
                        target="_blank"
                        href={URl}
                        onClick={onConfirm}
                        className="shadowed-button flex justify-center items-center mt-3 group disabled:white disabled:bg-primary-600 disabled:cursor-not-allowed text-primary relative w-full font-semibold focus:outline-none"
                    >
                        View in new tab
                        <ExternalLinkIcon className='ml-2 h-5 w-5' />
                    </a>
                </div>
            }
        </div>)
}
