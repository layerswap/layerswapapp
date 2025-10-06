import { motion } from "framer-motion";
import GoHomeButton from "../utils/GoHome";
import { useMeasure } from "@uidotdev/usehooks";
import LayerSwapLogo from "../icons/layerSwapLogo";

const variants = {
    enter: () => {
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
    exit: () => {
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
    let [footerRef, { height }] = useMeasure();

    return (
        sticky ?
            <div>
                <motion.div
                    ref={footerRef}
                    transition={{
                        duration: 0.15,
                    }}
                    custom={{ direction: -1, width: 100 }}
                    variants={variants}
                    className={`text-primary-text text-base sm:mt-3        
                        max-sm:fixed
                        max-sm:inset-x-0
                        max-sm:bottom-0 
                        max-sm:z-30
                        max-sm:bg-secondary-700 
                        max-sm:shadow-widget-footer 
                        max-sm:p-4 
                        max-sm:px-4 
                        max-sm:w-full ${hidden ? 'animation-slide-out' : ''}`}>
                    {children}
                    <div className="flex justify-center items-center text-primary-text-tertiary">
                        <span className="text-xs content-center footerLogo mt-2.5">Powered by</span>
                        <div>
                            <LayerSwapLogo className="footerLogo text-logo fill-secondary-text text-logo footerLogo ml-1 mt-2.5  h-5 w-auto cursor-pointer" />
                        </div>
                    </div>
                </motion.div>

                <div style={{ height: `${height}px` }}
                    className={`text-primary-text text-base sm:mt-3        
                             max-sm:inset-x-0
                             max-sm:bottom-0 
                             max-sm:p-4 max-sm:w-full invisible sm:hidden`}>
                </div>
            </div>
            :
            <>
                {children}
            </>
    )
}
export default Footer;