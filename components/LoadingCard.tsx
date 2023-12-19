import { FC, useEffect } from "react"
import { useLoadingState } from "../context/loadingContext"

type Props = {
    name: string
}
const LoadingCard: FC<Props> = ({ name }) => {
    return <div
        className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}
    >
        <div className='text-center text-xl text-secondary-100'>
        </div>
        <div className="relative px-6">
            <div className="flex items-start">
                <div className={`flex flex-nowrap grow`}>
                    <div className="w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full">
                        <div className="sm:min-h-[504px] flex flex-col justify-between">
                            <div className="relative m-auto origin-center">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="widget_root" />
    </div>
}
export default LoadingCard