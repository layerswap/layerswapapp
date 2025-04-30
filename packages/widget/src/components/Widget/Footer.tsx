import { motion } from "framer-motion";
import GoHomeButton from "../utils/GoHome";
import { useMeasure } from "@uidotdev/usehooks";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import AppSettings from "../../lib/AppSettings";
import { ReactNode } from "react";

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
    children?: ReactNode;
    sticky?: boolean
}

const Comp = ({ children, hidden, sticky = true }: FooterProps) => {
    let [footerRef, { height }] = useMeasure();

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

const Footer = ({ children, hidden, sticky }: FooterProps) => {
    const isFooterVisible = LayerSwapApiClient.apiKey !== AppSettings.LayerswapApiKeys['mainnet'] &&
        LayerSwapApiClient.apiKey !== AppSettings.LayerswapApiKeys['testnet']

    const isFooterSticky = AppSettings.ThemeData?.footerSticky ?? false

    return (
        <Comp hidden={hidden} sticky={isFooterSticky ? sticky : false}>
            {children}
            {
                isFooterVisible &&
                <a target="_blank" href='https://layerswap.io/' className="flex justify-center text-primary-text-placeholder mt-3 -mb-1.5 sm:-mb-3">
                    <span className="text-xs content-center">Powered by</span> <GoHomeButton className='ml-1 fill-primary-text-placeholder h-5 w-auto cursor-pointer' />
                </a>
            }
        </Comp>
    )
}

export default Footer;