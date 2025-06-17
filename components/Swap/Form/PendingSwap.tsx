import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { useSwapDataState } from "@/context/swap";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const textMotion = {
    rest: {
        color: "grey",
        x: 0,
        transition: {
            duration: 0.4,
            type: "tween",
            ease: "easeIn"
        }
    },
    hover: {
        color: "blue",
        x: 30,
        transition: {
            duration: 0.4,
            type: "tween",
            ease: "easeOut"
        }
    }
};

export const PendingSwap = ({ onClick }: { onClick: () => void }) => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const {
        destination_exchange,
        source_exchange,
        source_network,
        destination_network
    } = swap || {}

    if (!swap?.id)
        return <></>

    return <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
    >
        <motion.div
            onClick={onClick}
            initial="rest" whileHover="hover" animate="rest"
            className="bg-secondary-400 rounded-r-lg"
        >
            <motion.div
                variants={textMotion}
                className="flex items-center bg-secondary-400 rounded-r-lg">
                <div className="text-primary-text flex px-3 p-2 items-center space-x-2">
                    <div className="shrink-0 h-5 w-5 relative">
                        {source_exchange ? <ImageWithFallback
                            src={source_exchange.logo}
                            alt="From Logo"
                            height="60"
                            width="60"
                            className="rounded-md object-contain"
                        /> : source_network ?
                            <ImageWithFallback
                                src={source_network.logo}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            /> : null
                        }
                    </div>
                    <ChevronRight className="block h-4 w-4 mx-1" />
                    <div className="shrink-0 h-5 w-5 relative block">
                        {destination_exchange ? <ImageWithFallback
                            src={destination_exchange.logo}
                            alt="To Logo"
                            height="60"
                            width="60"
                            className="rounded-md object-contain"
                        /> : destination_network ?
                            <ImageWithFallback
                                src={destination_network.logo}
                                alt="To Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            /> : null
                        }
                    </div>
                </div>
            </motion.div>
        </motion.div>
    </motion.div>
}