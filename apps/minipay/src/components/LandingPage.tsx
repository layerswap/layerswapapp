import React from "react";
import LayerswapLogo from "../icons/LayerswapLogo"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"


const LandingPage = ({ onFinish }: { onFinish: () => void }) => {
    return (
        <div className='flex flex-col items-center w-full h-full space-y-3 md:space-y-8 !text-secondary-text'>
            <div className='mt-3 md:mt-12 md:mb-8 mx-auto px-4 overflow-hidden'>
                <LayerswapLogo className='h-8 md:h-11 w-auto text-[rgb(255,0,147)] fill-primary-text cursor-pointer' />
            </div>
            <motion.div className={`p-6 bg-secondary-800 border-secondary-700 md:border-2  rounded-xl w-full sm:overflow-hidden h-fit relative max-w-[500px] space-y-6`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { duration: 0.6, delay: 0.5 } }}
                exit={{ y: -10, opacity: 0 }}>
                <div className="space-y-3">
                    <h1 className='text-2xl md:text-3xl font-semibold text-primary-text'>
                        Welcome to Layerswap
                    </h1>
                    <p className='text-primary-text'>
                        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Dolorum obcaecati corporis, sint, placeat consequatur earum, quasi modi tempore repellendus magni odit maiores voluptates ipsam deserunt nulla nihil impedit culpa numquam.
                    </p>
                </div>
                <div className={`w-full flex flex-col gap-4 h-full`}>
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1, transition: { duration: 0.6, delay: 0.5 } }}
                        exit={{ y: -10, opacity: 0 }}
                        className="mt-6 flex justify-start gap-5 items-center ">
                        <button
                            onClick={onFinish}
                            className="relative group overflow-hidden px-4 w-fit h-11 font-semibold rounded-xl flex space-x-1 items-center bg-primary-500 hover:shadow-lg hover:shadow-primary-500/50 active:scale-90 transition duration-200 text-primary-text"
                        >
                            <span >
                                Launch App
                            </span>
                            <div className="flex items-center -space-x-3 translate-x-3">
                                <div className="w-2.5 h-0.5 rounded-full bg-white origin-left scale-x-0 transition duration-300 group-hover:scale-x-100"></div>
                                <ChevronRight className="h-5 w-5 stroke-white -translate-x-2 transition duration-300 group-hover:translate-x-0" />
                            </div>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default LandingPage;