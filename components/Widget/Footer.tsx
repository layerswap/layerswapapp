import { motion } from "framer-motion";
import { FC, useRef, useState } from "react"
import ReactPortal from "../Common/ReactPortal";


const variants = {
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
                        max-sm:z-30 max-sm:bg-secondary-900 max-sm:shadow-widget-footer max-sm:p-4 max-sm:px-6 max-sm:w-full ${hidden ? 'adnimation-slide-out' : ''}`}>
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
export default Footer;