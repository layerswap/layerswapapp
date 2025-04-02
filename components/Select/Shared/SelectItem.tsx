import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image';

export default function SelectItem({ item, underline }: { item: ISelectMenuItem, underline?: boolean }) {
    return (
        <div className={`flex items-center justify-between gap-3 w-full overflow-hidden`}>
            <div className={`gap-4 relative flex items-center w-full`}>
                <div className="shrink-0">
                    <div>{item.leftIcon}</div>
                </div>
                <div className={`h-8 w-8 shrink-0 relative`}>
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
                <div className={`flex justify-between w-full items-center py-3 ${underline ? 'border-b border-secondary-700' : ''}`}>
                    <span className="flex items-center pb-0.5 text-base">
                        {item.displayName || item.name}
                    </span>
                    {item.badge && <span className="ml-2">{item.badge}</span>}
                    <span className="ml-auto pl-2">{item.details}</span>
                </div>
            </div>
        </div>
    );
}