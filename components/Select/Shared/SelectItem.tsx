import { FC, useState } from "react";
import { Tooltip, TooltipTrigger } from "../../shadcn/tooltip";
import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image'
import { motion } from "framer-motion";

export function SelectItem({ item }: { item: ISelectMenuItem }) {

    return (
        <SelectItemWrapper item={item} >
            <div className={`relative flex items-center gap-4 pl-4`}>
                {item.icon && item.icon}
                <div className="flex-shrink-0 h-6 w-6 ml-0.5 relative">
                    {item.imgSrc && (
                        <Image
                            src={item.imgSrc}
                            alt="Project Logo"
                            height="40"
                            width="40"
                            loading="eager"
                            className="rounded-md object-contain"
                        />
                    )}
                </div>
                <p className='text-md font-medium flex w-full justify-between space-x-2'>
                    <span className="flex items-center justify-center pb-0.5">{item.displayName ? item.displayName : item.name}</span>
                    {item.badge}
                </p>
            </div>
        </SelectItemWrapper>
    );
}

const SelectItemWrapper: FC<{ item: ISelectMenuItem, children: JSX.Element | JSX.Element[]; }> = ({ item, children }) => {
    const [showDisabledDetails, setShowDisabledDetails] = useState(false);

    const disabled = !item.isAvailable.value;

    const handleMobileTap = () => {
        setShowDisabledDetails(!showDisabledDetails);
    };

    const handleMouseEnter = () => {
        setShowDisabledDetails(true);
    };

    const handleMouseLeave = () => {
        setShowDisabledDetails(false);
    };

    if (!disabled)
        return <div className="flex items-center justify-between gap-4 w-full overflow-hidden">{children}</div>

    return (
        <div
            className="w-full"
            onClick={handleMobileTap}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="opacity-50 flex items-center justify-between gap-4 w-full overflow-hidden">
                {children}
            </div>
            {
                showDisabledDetails &&
                <motion.div
                    initial={{ x: 120 }}
                    animate={{ x: 50 }}
                    exit={{ x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute z-20 p-2 max-w-72 shadow-md top-0 rounded text-primary-text-placeholder text-xs bg-secondary-800 border border-secondary"
                >
                    {item.disabledDetails}
                </motion.div>
            }
        </div>
    );
}

export default SelectItem;
