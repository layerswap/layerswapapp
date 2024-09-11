import { useState } from "react";
import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image';

export default function SelectItem({ item }: { item: ISelectMenuItem }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="flex items-center justify-between gap-3 w-full overflow-hidden px-0.5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative flex items-center gap-3 pl-1">
                <div className="flex-shrink-0">
                    {item.icon}
                </div>
                <div className="flex-shrink-0 h-9 w-9 relative">
                    {item.imgSrc && (
                        <Image
                            src={item.imgSrc}
                            alt="Project Logo"
                            height="40"
                            width="40"
                            loading="eager"
                            className="rounded-full object-contain"
                        />
                    )}
                </div>
                <p className="text-md font-medium flex w-full justify-between space-x-2 items-center">
                    <span className="flex items-center justify-center pb-0.5">
                        {item.menuItemImage && item.menuItemImage}
                        {item.menuItemLabel ? item.menuItemLabel : item.name}
                    </span>
                    {item.badge && <span>{item.badge}</span>}
                </p>
            </div>
            <div>
                {item.menuItemDetails && item.menuItemDetails}
            </div>
            {(isHovered && item?.noWalletsConnectedText) && item?.noWalletsConnectedText}
        </div>
    );
}