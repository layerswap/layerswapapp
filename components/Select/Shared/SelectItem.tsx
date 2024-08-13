import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image'

export default function SelectItem({ item }: { item: ISelectMenuItem }) {
    const isDisabled = !item.isAvailable;

    return (<div className={`${isDisabled ? "opacity-50" : ""} flex items-center justify-between gap-4 w-full overflow-hidden`}>
        <div className={`${item?.details ? "gap-2" : "gap-4"} relative flex items-center pl-4`}>
            {!isDisabled && item?.leftIcon}
            <div className={`${item?.details ? "h-9 w-9" : "h-6 w-6"} flex-shrink-0 relative`}>
                {item.imgSrc && <Image
                    src={item.imgSrc}
                    alt="Project Logo"
                    height="40"
                    width="40"
                    loading="eager"
                    className="rounded-md object-contain" />}
            </div>
            <p className='text-md font-medium flex w-full justify-between space-x-2'>
                <div className="flex flex-col">
                    <span className="flex items-center pb-0.5">{item.displayName ? item.displayName : item.name}</span>
                    {item.details}
                </div>
                {item.badge}
            </p>
        </div>
        {
            item.rightIcon &&
            <>
                {item.rightIcon}
            </>
        }
    </div>);
}
