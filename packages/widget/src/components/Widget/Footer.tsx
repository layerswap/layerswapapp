import { motion } from "framer-motion";
import GoHomeButton from "../utils/GoHome";
import { useMeasure } from "@uidotdev/usehooks";
import AppSettings from "../../lib/AppSettings";

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
    const isFooterVisible = AppSettings.apikey !== 'NDBxG+aon6WlbgIA2LfwmcbLU52qUL9qTnztTuTRPNSohf/VnxXpRaJlA5uLSQVqP8YGIiy/0mz+mMeZhLY4/Q' &&
        AppSettings.apikey !== 'Dz1jVir9WUD0gBWoGbOmS1oe5K4985SGptaZXjF4z9VVrvO5nC9q55h8TE/3CIESRxWdYVpPnz/H2BogL2eG+A'

    return (
        sticky ?
            <>
                <motion.div
                    ref={footerRef}
                    transition={{
                        duration: 0.15,
                    }}
                    custom={{ direction: -1, width: 100 }}
                    variants={variants}
                    className={`text-primary-text text-base mt-3        
                        max-sm:fixed
                        max-sm:inset-x-0
                        max-sm:bottom-0 
                        max-sm:z-30
                        max-sm:bg-secondary-900 
                        max-sm:shadow-widget-footer 
                        max-sm:p-4 
                        max-sm:px-6 
                        max-sm:w-full ${hidden ? 'animation-slide-out' : ''}`}>
                    {children}
                    {isFooterVisible &&
                        <a target="_blank" href='https://layerswap.io/' className="flex justify-center text-primary-text-placeholder">
                            <span className="text-xs content-center mt-2.5">Powered by</span> <GoHomeButton className='ml-1 mt-2.5 fill-primary-text-placeholder h-5 w-auto cursor-pointer' />
                        </a>
                    }

                </motion.div>

                <div style={{ height: `${height}px` }}
                    className={`text-primary-text text-base mt-3        
                             max-sm:inset-x-0
                             max-sm:bottom-0 
                             max-sm:p-4 max-sm:w-full invisible sm:hidden`}>
                </div>
            </ >
            :
            <>
                {children}
            </>
    )
}
export default Footer;