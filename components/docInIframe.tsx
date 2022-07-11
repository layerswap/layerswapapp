import { useState } from "react"

type Props = {
    URl: string;

}
function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
export function DocIframe({ URl }: Props) {
    const [loading, setLoading] = useState(false)
    const handleIframeLoaded = () => setLoading(false)

    if (loading)
        return <Sceleton />
        
    return <div className="text-white text-base">
        <div className='relative pb-96'>
            <iframe onLoad={handleIframeLoaded} src={URl} className='scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50 border-0 self-center absolute w-full h-full'></iframe>
        </div>
    </div>
}

const Sceleton = () => {
    return <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative`}>
        <div className="px-4 sm:px-6 lg:px-8 mb-2">

            <div className="animate-pulse">
                <div className="-mx-4 mt-10 ring-1 ring-darkblue-100 sm:-mx-6 md:mx-0 md:rounded-lg bg-darkblue-600">
                    <table className="min-w-full divide-y divide-darkblue-100">
                        <thead>
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-500 sm:pl-6">
                                    <div className="hidden lg:block">
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </div>
                                    <div className="block lg:hidden">
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </div>
                                </th>
                                <th
                                    scope="col"
                                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                                >
                                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-500 "
                                >
                                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                </th>
                                {/* <th
            scope="col"
            className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
          >
            Fee
          </th> */}
                                <th
                                    scope="col"
                                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                                >
                                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                </th>
                                <th
                                    scope="col"
                                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                                >
                                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                </th>

                                <th
                                    scope="col"
                                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                                >
                                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                </th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)]?.map((item, index) => (
                                <tr key={index}>
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-transparent',
                                            'relative py-4 pl-4 sm:pl-6 pr-3 text-sm'
                                        )}
                                    >
                                        <div className="text-white hidden lg:block">
                                            <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                        </div>
                                        <div className="mt-1 flex flex-col text-white sm:block lg:hidden">
                                            <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                        </div>
                                        {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-100" /> : null}
                                    </td>
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-darkblue-100',
                                            'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                                        )}
                                    >
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </td>
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-darkblue-100',
                                            'px-3 py-3.5 text-sm text-white table-cell'
                                        )}
                                    >
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </td>
                                    {/* <td
              className={classNames(
                index === 0 ? '' : 'border-t border-darkblue-100',
                'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
              )}
            >
              {swap.fee} {swap.currency} 
            </td> */}
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-darkblue-100',
                                            'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                                        )}
                                    >
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </td>
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-darkblue-100',
                                            'relative px-3 py-3.5 text-sm text-white hidden lg:table-cell group'
                                        )}
                                    >
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>

                                    </td>
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-darkblue-100',
                                            'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                                        )}
                                    >
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </td>
                                    <td
                                        className={classNames(
                                            index === 0 ? '' : 'border-t border-transparent',
                                            'relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium'
                                        )}
                                    >
                                        <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
}