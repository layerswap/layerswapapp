export default function WidgetLoading() {
    return (
        <div className="w-full h-full max-w-lg z-[1] sm:mb-6 mx-auto">
            <div className="flex h-full content-center items-center justify-center flex-col container mx-auto sm:px-6 max-w-lg">
                <div className="flex h-full flex-col w-full text-primary-text">
                    <div className="bg-secondary-900 rounded-lg w-full sm:overflow-hidden relative text-left">
                        <div className="relative px-6">
                            <div className="flex items-start">
                                <div className="flex flex-nowrap grow w-full">
                                    <div className="w-full pb-6 flex flex-col justify-between text-secondary-text sm:min-h-[500px] h-full">
                                        <div className="flex flex-col">
                                            <div className="w-full h-14 bg-secondary-700 rounded-lg animate-pulse mt-4" />

                                            <div className="h-8 flex flex-col ml-auto gap-1">
                                                <div className="w-6 h-1 bg-secondary-600 rounded animate-pulse" />
                                                <div className="w-6 h-1 bg-secondary-600 rounded animate-pulse" />
                                                <div className="w-6 h-1 bg-secondary-600 rounded animate-pulse" />
                                            </div>

                                            <div className="bg-secondary-600 pt-8 grid grid-cols-6 gap-2 space-y-1 items-end p-3 rounded-xl my-4 mb-10">
                                                <div className="col-span-4 h-12 bg-secondary-800 rounded-lg animate-pulse mt-6">&nbsp;</div>
                                                <div className="col-span-2 h-12 bg-secondary-800 rounded-lg animate-pulse mt-6">&nbsp;</div>

                                                <div className="col-start-4 col-span-1 flex justify-start items-center py-2">
                                                    <div className="w-8 h-8 bg-secondary-800 rounded-lg animate-pulse" />
                                                </div>

                                                <div className="col-span-4 h-12 bg-secondary-800 rounded-lg animate-pulse">&nbsp;</div>
                                                <div className="col-span-2 h-12 bg-secondary-800 rounded-lg animate-pulse">&nbsp;</div>
                                            </div>

                                            <div className="w-full h-12 bg-secondary-600 rounded-lg animate-pulse mt-2">&nbsp;</div>
                                        </div>

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
    );
}
