import { MenuIcon, ChevronLeft } from "lucide-react";

export default function WidgetLoading() {
    return (
        <div className="w-full h-full max-w-lg z-[1] sm:mb-6 mx-auto">
            <div className="flex h-full content-center items-center justify-center flex-col container mx-auto sm:px-6 max-w-lg">
                <div className="flex h-full flex-col w-full">
                    <div className="bg-secondary-900 rounded-lg w-full sm:overflow-hidden relative text-left">
                        <div className="relative">
                            <div className="flex items-start">
                                <div className="flex flex-nowrap grow w-full">
                                    <div className="w-full pb-6 flex flex-col justify-between text-secondary-500 sm:min-h-[500px] h-full">
                                        <div className="flex flex-col">
                                            <div className="w-full grid grid-cols-5 px-6 mt-3 pb-2">
                                                <div className="col-start-5 justify-self-end self-center flex items-center gap-x-1 -mr-2">
                                                    <div className="mx-2 space-y-1 py-1.5">
                                                        <MenuIcon strokeWidth="2" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-6">
                                                <div className="bg-secondary-700 pt-8 grid grid-cols-6 gap-2 space-y-1 items-end p-3 rounded-xl my-4 mb-12" >
                                                    <div className="col-span-4 h-12 bg-secondary-600 rounded-lg animate-pulse mt-6">&nbsp;</div>
                                                    <div className="col-span-2 h-12 bg-secondary-600 rounded-lg animate-pulse mt-6">&nbsp;</div>

                                                    <div className="col-start-4 col-span-1 flex justify-start items-center py-2">
                                                        <div className="w-8 h-8 bg-secondary-600 rounded-lg animate-pulse" />
                                                    </div>

                                                    <div className="col-span-4 h-12 bg-secondary-600 rounded-lg animate-pulse">&nbsp;</div>
                                                    <div className="col-span-2 h-12 bg-secondary-600 rounded-lg animate-pulse">&nbsp;</div>
                                                </div>
                                                <div className="w-full h-12 bg-secondary-600 rounded-lg animate-pulse mt-2">&nbsp;</div>
                                                <div className="mt-10">
                                                    <div className="w-full h-[50px] bg-primary animate-pulse rounded-lg" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
