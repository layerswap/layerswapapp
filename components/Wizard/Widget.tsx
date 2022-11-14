import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormWizardaUpdate } from '../../context/formWizardProvider';

const Widget = ({ children }) => {
    return <div className="w-full flex flex-col justify-between h-full space-y-5 text-primary-text">{children}</div>
}
const Content = ({ children }) => {
    return <><div className='space-y-4'>{children}</div></>
}
const variants = {
    enter: {
        opacity: 0
    },
    done: {
        opacity: 1
    },
    exit: {
        opacity: 0
    },
}
const Footer = ({ children }) => {
    const [animationEnd, setAnimationEnd] = useState(false)
    const [height, setHeight] = useState(0)
    const ref = useRef(null)
    const { setHasFooter } = useFormWizardaUpdate()

    useEffect(()=>{
        setHasFooter(true)
    },[])
    
    const handleAnimationEnd = (variant) => {
        if (variant == "done") {
            setAnimationEnd(true)
            setHeight(ref?.current?.clientHeight)
        }
    }
    return <>
        <motion.div onAnimationComplete={handleAnimationEnd}
            ref={ref}
            variants={variants} className={`text-white text-base mt-3        
                max-sm:fixed
                max-sm:inset-x-0
                max-sm:bottom-0 
                max-sm:z-50 max-sm:bg-darkblue max-sm:p-4 max-sm:shadow-card max-sm:rounded-lg max-sm:w-full ${animationEnd ? 'max-sm:visible max-sm:animate-slide-in' : 'max-sm:invisible'}`}>{children}
        </motion.div>
        <ReactPortal wrapperId='offset-for-stickyness'>
            <div style={{ height: `${height}px` }}
                className={`text-white text-base mt-3        
                        max-sm:inset-x-0
                        max-sm:bottom-0 
                        max-sm:p-4 max-sm:w-full invisible`}>
            </div>
        </ReactPortal>
    </>
}

Widget.Content = Content
Widget.Footer = Footer
function ReactPortal({ children, wrapperId = "react-portal-wrapper" }) {
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