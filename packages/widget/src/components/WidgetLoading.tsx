import { MenuIcon } from "lucide-react";
import ColorSchema from "./ColorSchema";
import AppSettings from "../lib/AppSettings";
import { FC } from "react";
import WalletIcon from "./Icons/WalletIcon";

export const WidgetLoading: FC = () => {
    return (
        <>
            <ColorSchema themeData={AppSettings.ThemeData} />
            <div className="relative w-fit h-fit max-w-lg mx-auto p-px">
                {
                    AppSettings.ThemeData?.enableWideVersion &&
                    <>
                        <div className="absolute left-0 top-24 -translate-x-[100%] z-20 w-12 h-22 rounded-l-xl">
                            <div className="flex flex-col bg-secondary-400 h-full p-1.5 sm:p-2 w-full space-y-2 animate-pulse rounded-l-xl" />
                        </div>
                        <div className="invisible sm:visible absolute inset-0 rounded-[25px] sm:pb-4 bg-gradient-to-t from-secondary-800 to-secondary-300 pointer-events-none" />
                    </>
                }
                <div className="layerswap-styles w-full sm:pb-4 z-[1] mx-auto rounded-3xl md:shadow-lg  relative bg-gradient-to-b from-secondary-700 to-secondary-700 ">
                    <div className="flex h-full content-center items-center justify-center flex-col container mx-auto">
                        <div className="flex h-full flex-col w-wit">
                            <div className="w-full overflow-visible relative text-left">
                                <div className="relative">
                                    <div className="flex items-start">
                                        <div className="flex flex-nowrap grow w-full">
                                            <div className="w-fit flex flex-col justify-between text-secondary-500 h-full">
                                                <div className="flex flex-col">
                                                    <div className="w-full grid grid-cols-5 px-6 mt-2 pb-2">
                                                        <div className="col-start-5 justify-self-end self-center flex items-center gap-x-1 -mr-2">
                                                            {
                                                                !AppSettings.ThemeData?.header?.hideWallets && <div className="space-y-1 py-1.5">
                                                                    <WalletIcon className="w-6 h-6" strokeWidth="2" />
                                                                </div>
                                                            }
                                                            {
                                                                !AppSettings.ThemeData?.header?.hideMenu && <div className="mx-2 space-y-1 py-1.5">
                                                                    <MenuIcon className="w-6 h-6" strokeWidth="2" />
                                                                </div>
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="px-4 h-full grow flex flex-col flex-1 justify-between w-full gap-3">
                                                        <div className="flex-col relative flex justify-between gap-2 w-full leading-4">
                                                            <div className="flex flex-col bg-secondary-500 rounded-2xl p-4 pb-[15px] space-y-[27px] w-[438px] h-[156px] group animate-pulse">
                                                                <div className="grid grid-cols-9 gap-2 items-center h-7">
                                                                    <div className="block col-span-5 h-5" />
                                                                </div>
                                                                <div className="relative">
                                                                    <div className="justify-self-end self-start">
                                                                        <div className="flex flex-col self-end relative items-center">
                                                                            <div className="rounded-2xl flex items-center relative w-full z-10 self-end">
                                                                                <div className="rounded-2xl relative grow flex items-center justify-bottom px-2 pr-0 bg-secondary-300 py-[6px] h-12 w-40" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-lg w-7 h-7 bg-secondary-400 animate-pulse" />
                                                            <div className="flex flex-col bg-secondary-500 rounded-2xl p-4 pb-[15px] space-y-[27px] w-[438px] h-[154px] group animate-pulse">
                                                                <div className="grid grid-cols-9 gap-2 items-center h-7">
                                                                    <div className="block col-span-5 h-5" />
                                                                </div>
                                                                <div className="relative">
                                                                    <div className="justify-self-end self-start">
                                                                        <div className="flex flex-col self-end relative items-center">
                                                                            <div className="rounded-2xl flex items-center relative w-full z-10 self-end">
                                                                                <div className="rounded-2xl relative grow flex items-center justify-bottom px-2 pr-0 bg-secondary-300 py-[6px] h-12 w-40" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="">
                                                            <div className="w-full h-12 bg-primary animate-pulse rounded-xl py-3 px-2 md:px-3" />
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
            </div>
        </>
    )
}