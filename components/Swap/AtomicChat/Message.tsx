import { motion } from "framer-motion";
import { FC } from "react"

export type Meesage = {

}

type Props = {
    title: JSX.Element | string;
    description?: JSX.Element | string | null;
    index?: number;
    isLast: boolean;
    source: 'from' | 'to';
    sourceIcon?: JSX.Element | string;
}

const Component: FC<Props> = (props) => {
    const { title, description, isLast, source, sourceIcon } = props

    return <div className={`rounded-lg py-2 relative z-10`}>
        <div className={`flex space-x-2 w-full relative grow ${source == 'from' ? 'justify-start' : 'justify-end flex-row-reverse space-x-reverse'}`}>
            <div className="rounded-lg bg-secondary-700 p-2 self-start">
                {sourceIcon || <div className="w-4 h-4"></div>}
            </div>
            <motion.div
                className={`z-10 flex flex-1 ${source == 'from' ? 'justify-start origin-top-left' : 'justify-end origin-top-right'} `}
                initial={{ scale: 0.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className={`bg-secondary-700 rounded-lg px-2 py-2 relative flex max-w-[80%] ${source == 'from' ? 'justify-start' : 'justify-end'} `}>
                    <div className={`group relative space-x-3 flexitems-center`} >
                        <div className="font-normal flex flex-col  relative z-10 space-y-4">
                            <div className="flex items-center justify-between grow">
                                <div className="flex items-center gap-3 ">
                                    <span className="flex min-w-0 flex-col ">
                                        <span className={`text-sm font-medium ${isLast ? "text-primary-text" : "text-secondary-text"} ${source == 'from' ? 'text-start' : 'text-end'}`}>{title}</span>
                                        {
                                            description &&
                                            <span className="text-xs text-secondary-text">{description}</span>
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div >
        </div>
    </div>




}



export default Component