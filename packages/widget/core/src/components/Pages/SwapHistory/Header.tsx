import { useEffect, useRef, useState } from "react"
import HeaderWithMenu from "@/components/HeaderWithMenu";
import { motion } from "framer-motion";

const Header = ({ onBackClick }: { onBackClick: () => void }) => {

    const [height, setHeight] = useState(0)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setHeight(Number(ref?.current?.clientHeight))
    }, [])

    const handleAnimationEnd = (variant) => {
        if (variant == "center") {
            setHeight(Number(ref?.current?.clientHeight))
        }
    }
    return <>
        <motion.div
            onAnimationComplete={handleAnimationEnd}
            ref={ref}
            transition={{
                duration: 0.15,
            }}
            custom={{ direction: -1, width: 100 }}
            variants={variants}
            className={`text-primary-text text-base        
        max-sm:fixed
        max-sm:inset-x-0
        max-sm:top-0 
        max-sm:z-30
        max-sm:bg-secondary-700 
        max-sm:shadow-widget-footer 
        max-sm:w-full`}>
            <HeaderWithMenu goBack={onBackClick} />
        </motion.div>
        <div style={{ height: `${height}px` }}
            className={`text-primary-text text-base        
          max-sm:inset-x-0
          max-sm:bottom-0 
          max-sm:p-4 max-sm:w-full invisible sm:hidden`}>
        </div>
    </>

}

const variants = {
    enter: () => {
        return ({
            opacity: 0,
            y: '-100%',
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
            y: '-100%',
            zIndex: 0,
            opacity: 0,
        })
    },
};

export default Header;