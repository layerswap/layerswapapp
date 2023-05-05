import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image'

export default function SelectItem({ item }: { item: ISelectMenuItem}) {
    return (<div className="flex items-center">
        <div className="flex-shrink-0 h-6 w-6 relative">
            {item.imgSrc && <Image
                src={item.imgSrc}
                alt="Project Logo"
                height="40"
                width="40"
                loading="eager"
                className="rounded-md object-contain" />}
        </div>
        <div className="ml-4 ">
            <p className='text-md font-medium'>
                {item.name}
            </p>
        </div>
    </div>);
}