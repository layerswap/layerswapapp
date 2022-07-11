import { Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import React from "react";
import { FC, forwardRef, Fragment, ReactNode, useImperativeHandle, useState } from "react"

type Props = {
    opener?: ReactNode,
    children?: ReactNode;
    moreClassNames?: string;
}
export type SildeOverRef = {
    close: () => void;
    open: () => void;
};

const SlideOver = forwardRef<SildeOverRef, Props>(({ opener, moreClassNames, children }, ref) => {
    const [open, setOpen] = useState(false)
    const handleClose = () => {
        setOpen(false)
    }
    const handleOpen = () => {
        setOpen(true)
    }
    useImperativeHandle(ref, () => ({
        close: handleClose,
        open: handleOpen
    }), []);

    return (
        <>
            <span onClick={handleOpen}>{opener}</span>
            <Transition
                appear
                show={open}
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full">
                <div className={`absolute inset-0 z-40 flex flex-col w-full bg-darkBlue ${moreClassNames}`}>
                    <span className='relative z-40 overflow-hidden bg-darkBlue p-8 pt-0'>
                        <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                            <span className="justify-self-end text-light-blue cursor-pointer">
                                <div className="">
                                    <button
                                        type="button"
                                        className="rounded-md text-darkblue-200 focus:ring-2 hover:text-light-blue"
                                        onClick={handleClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                            </span>
                        </div>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="relative inset-0" ></div>
                        </Transition.Child>

                        <div className="relative inset-0 text-pink-primary-300 flex flex-col scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                            <div className="relative min-h-full items-center justify-center pt-0 text-center">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >

                                    <div className='pb-12 grid grid-flow-row min-h-[480px] text-pink-primary-300'>
                                        {children}
                                    </div>
                                </Transition.Child>
                            </div>
                        </div>
                    </span>
                </div>
            </Transition>
        </>
    )
})

export default SlideOver;