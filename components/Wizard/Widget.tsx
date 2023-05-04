import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

const Widget = ({ children }) => {
    return <div className="w-full flex flex-col justify-between h-full space-y-5 text-primary-text">{children}</div>
}
type ContetProps = {
    center?: boolean,
    children?: JSX.Element | JSX.Element[];
}
const Content = ({ children, center }: ContetProps) => {
    return center ?
        <div className='flex flex-col self-center grow w-full'>
            <div className='flex self-center grow w-full'>
                <div className='flex flex-col self-center w-full'>
                    {children}
                </div>
            </div>
        </div>
        : <div className='space-y-4 py-3'>{children}</div>
}
export let variants = {
    enter: ({ direction, width }) => {
        return ({
            opacity: 0,
            y: '100%',
        })
    },
    center: () => {
        return ({
            opacity: 1,
            y: 0,
        })
    },
    exit: ({ direction, width }) => {
        return ({
            y: '100%',
            zIndex: 0,
            opacity: 0,
        })
    },
};
type FooterProps = {
    hidden?: boolean,
    children?: JSX.Element | JSX.Element[];
    sticky?: boolean
}
const Footer = ({ children, hidden, sticky = true }: FooterProps) => {
    const [height, setHeight] = useState(0)
    const ref = useRef(null)

    const handleAnimationEnd = (variant) => {
        if (variant == "center") {
            setHeight(ref?.current?.clientHeight)
        }
    }
    return (
        sticky ?
            <>
                <motion.div
                    onAnimationComplete={handleAnimationEnd}
                    ref={ref}
                    transition={{
                        duration: 0.15,
                    }}
                    custom={{ direction: "back" ? -1 : 1, width: 100 }}
                    variants={variants}
                    className={`text-white text-base mt-3        
                        max-sm:fixed
                        max-sm:inset-x-0
                        max-sm:bottom-0 
                        max-sm:z-30 max-sm:bg-darkblue-900 max-sm:shadow-widget-footer max-sm:p-4 max-sm:px-6 max-sm:w-full ${hidden ? 'adnimation-slide-out' : ''}`}>
                    {children}
                </motion.div>
                <ReactPortal wrapperId='offset-for-stickyness'>
                    <div style={{ height: `${height}px` }}
                        className={`text-white text-base mt-3        
                             max-sm:inset-x-0
                             max-sm:bottom-0 
                             max-sm:p-4 max-sm:w-full invisible`}>
                    </div>
                </ReactPortal>
            </ >
            :
            <>
                {children}
            </>
    )
}

Widget.Content = Content
Widget.Footer = Footer

export function ReactPortal({ children, wrapperId = "react-portal-wrapper" }) {
    let element = document.getElementById(wrapperId);
    // if element is not found with wrapperId,
    // create and append to body
    if (!element) {
        element = createWrapperAndAppendToBody(wrapperId);
    }
    return createPortal(children, element);
}
function createWrapperAndAppendToBody(wrapperId) {
    const wrapperElement = document.createElement('div');
    wrapperElement.setAttribute("id", wrapperId);
    document.body.appendChild(wrapperElement);
    return wrapperElement;
}
export default Widget