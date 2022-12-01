import { useEffect, useState } from "react"
import { ExternalLinkIcon } from "@heroicons/react/outline";
import { DocInFrameSceleton } from "./Sceletons";

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
        <div className="flex flex-col justify-between space-y-4 h-full">
            <div className='h-full'>
                {
                    loading && <DocInFrameSceleton />
                }
                <iframe src={URl} className={`${loading ? 'invisible h-0 w-0' : 'visible animate-fade-in-down min-h-[calc(100vh-170px)] sm:min-h-full'} border-0 self-center w-full sm:rounded-lg`} />
            </div>
            {
                !loading &&
                <a
                    target="_blank"
                    href={URl}
                    onClick={onConfirm}
                    className="shadowed-button hidden sm:flex justify-center items-center mt-3 group disabled:white disabled:bg-primary-600 disabled:cursor-not-allowed text-primary relative w-full font-semibold focus:outline-none"
                >
                    View in new tab
                    <ExternalLinkIcon className='ml-2 h-5 w-5' />
                </a>
            }
        </div>)
}
