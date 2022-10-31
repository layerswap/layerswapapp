import { Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, SetStateAction, useEffect } from "react";
import { FC, Fragment, ReactNode, useState } from "react"

export type slideOverPlace = 'inStep' | 'inModal' | 'inMenu'

type Props = {
    opener?: (open: () => void) => JSX.Element | JSX.Element[],
    children?: (close: () => void) => JSX.Element | JSX.Element[];
    moreClassNames?: string;
    slide?: boolean;
    place: slideOverPlace | string
    imperativeOpener?: [isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>]
}

const SlideOver: FC<Props> = (({ opener, imperativeOpener, moreClassNames, place, children, slide = true }) => {
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
            moreClassNames += " pt-7";
            break;
        case 'inMenu':
            moreClassNames += " pt-5";
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
                        className={`absolute inset-0 z-40 flex flex-col w-full bg-darkblue ${moreClassNames}`}>
                        <span className='relative z-40 overflow-hidden bg-darkblue px-6 pb-6 sm:px-8 sm:pb-8 pt-0'>
                            <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                                <span className="justify-self-end text-primary-text cursor-pointer">
                                    <button
                                        type="button"
                                        className="rounded-md text-darkblue-200 hover:text-primary-text"
                                        onClick={handleClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </span>
                            </div>
                            <div className="relative inset-0 flex flex-col styled-scroll">
                                <div className="relative min-h-full items-center justify-center pt-0 text-center">
                                    <div className='grid grid-flow-row min-h-[480px] text-primary-text'>
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