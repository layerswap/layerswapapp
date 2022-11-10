import { Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, SetStateAction, useEffect } from "react";
import { FC, Fragment, ReactNode, useState } from "react"

export type slideOverPlace = 'inStep' | 'inModal' | 'inMenu'

type Props = {
    header?: string;
    opener?: (open: () => void) => JSX.Element | JSX.Element[],
    children?: (close: () => void) => JSX.Element | JSX.Element[];
    moreClassNames?: string;
    place: slideOverPlace | string
    imperativeOpener?: [isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>]
}

const SlideOver: FC<Props> = (({ header, opener, imperativeOpener, moreClassNames, place, children }) => {
    const [open, setOpen] = useState(false)
    const handleClose = () => {
        setOpen(false)
        imperativeOpener?.[1](false);
    }
    const handleOpen = () => {
        setOpen(true)
        imperativeOpener?.[1](true);
    }

    switch (place) {
        case 'inStep':
            moreClassNames += " -mt-10";
            break;
        case 'inModal':
            moreClassNames += " pt-4";
            break;
        case 'inMenu':
            moreClassNames += " pt-4";
            break;
    }

    useEffect(() => {
        imperativeOpener && setOpen(imperativeOpener[0])
    }, [imperativeOpener?.[0]])
    return (
        <>
            <span>{opener && opener(handleOpen)}</span>
            <AnimatePresence>
                {open &&
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{
                            y: 0,
                            transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        exit={{
                            y: "100%",
                            transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        className={`absolute inset-0 z-40 w-full mt-1 bg-darkblue ${moreClassNames}`}>
                        <span className='relative h-full flex flex-col z-40 overflow-hidden px-6 md:px-8 pb-6'>
                            <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                                <span className="flex items-center justify-between text-primary-text cursor-pointer">
                                    <p className="text-xl text-white font-semibold">
                                        {header}
                                    </p>
                                    <button
                                        type="button"
                                        className="rounded-md hover:text-darkblue-200"
                                        onClick={handleClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-7 w-7" aria-hidden="true" />
                                    </button>
                                </span>
                            </div>
                            <div className="relative h-full inset-0 flex flex-col scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                                <div className="relative min-h-full items-center justify-center pt-0 text-center">
                                    <div className='grid grid-flow-row min-h-[480px] h-full text-primary-text'>
                                        {children && children(handleClose)}
                                    </div>
                                </div>
                            </div>
                        </span>
                    </motion.div>}
            </AnimatePresence>

        </>
    )
})
export default SlideOver;