import { ServerOff } from "lucide-react"
import Link from "next/link"

const Error500 = () => {
    return (
        <div className="flex h-full items-center justify-center p-5 w-full flex-1">
            <div className="text-center">
                <div className="inline-flex rounded-full relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 116 116" fill="none">
                        <circle cx="58" cy="58" r="58" fill="#E43636" fillOpacity="0.1" />
                        <circle cx="58" cy="58" r="45" fill="#E43636" fillOpacity="0.5" />
                        <circle cx="58" cy="58" r="30" fill="#E43636" />
                    </svg>
                    <ServerOff className="text-white absolute top-[calc(50%-16px)] right-[calc(50%-16px)] h-8 w-auto" />
                </div>
                <h1 className="mt-5 text-[36px] font-bold text-white lg:text-[50px]">500 - Oops</h1>
                <p className="text-primary-text my-5 lg:text-lg">Something went wrong. Try to refresh this page or <br /> feel free to contact us if the problem presists.</p>
                <Link href={'http://discord.gg/layerswap'} target="_blank" className="w-1/2 px-5 py-2 text-sm tracking-wide text-white transition-colors duration-200 bg-primary-500 rounded-lg shrink-0 sm:w-auto hover:bg-primary-500/80">
                    Contact support
                </Link>
            </div>
        </div>
    )
}

export default Error500