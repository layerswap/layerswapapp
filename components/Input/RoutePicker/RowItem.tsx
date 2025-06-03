import { Route } from "../../../Models/Route";
import Image from 'next/image';

export default function ({ item }: { item: Route }) {
    return (
        <div className={`px-3flex items-center justify-between gap-3 w-full overflow-hidden`}>
            <div className={`gap-2.5 relative flex items-center  pl-1 w-full`}>
                <div className={`h-9 w-9flex-shrink-0 relative`}>
                    {item.logo && (
                        <Image
                            src={item.logo}
                            alt="Project Logo"
                            height="40"
                            width="40"
                            loading="eager"
                            className="rounded-md object-contain"
                        />
                    )}
                </div>
                <div className="flex justify-between w-full items-center">
                    <span className="flex items-center pb-0.5">
                        {item.display_name}
                    </span>
                </div>
            </div>
        </div>
    );
}