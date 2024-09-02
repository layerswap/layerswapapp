import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image';

export default function SelectItem({ item }: { item: ISelectMenuItem }) {

    return (
        <div className="flex items-center justify-between gap-3 w-full overflow-hidden px-0.5">
            <div className="relative flex items-center gap-3 pl-1">
                <div className="flex-shrink-0">
                    <div>{item.icon}</div>
                </div>
                <div className="flex-shrink-0 h-6 w-6 relative">
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
                <p className="text-md font-medium flex w-full justify-between space-x-2">
                    <span className="flex items-center justify-center pb-0.5">
                        {item.displayName ? item.displayName : item.name}
                    </span>
                    {item.badge && <span>{item.badge}</span>}
                </p>
            </div>
        </div>
    );
}