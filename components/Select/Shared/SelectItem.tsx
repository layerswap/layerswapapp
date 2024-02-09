import { CurrencyDisabledReason } from "../../Input/CurrencyFormField";
import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image'

export default function SelectItem({ item }: { item: ISelectMenuItem }) {
    if (item.type === "currency")
        console.log(item, "item")
    return (<div className={`${item?.isAvailable?.disabledReason == CurrencyDisabledReason.InvalidRoute ? "opacity-40" : ""} flex items-center w-full`}>
        <div className="flex-shrink-0 h-6 w-6 relative">
            {item.imgSrc && <Image
                src={item.imgSrc}
                alt="Project Logo"
                height="40"
                width="40"
                loading="eager"
                className="rounded-md object-contain" />}
        </div>
        <div className="ml-4 flex items-center gap-3 justify-between w-full">
            <p className='text-md font-medium'>
                {item.name}
                {
                    item.type == "currency" &&
                    <p className="text-primary-text-muted text-xs">
                        {item.group}
                    </p>
                }
            </p>
            {
                item.details &&
                <p className="text-primary-text-muted flex flex-col items-end">
                    {Number(item.details.balanceAmount) ?
                        <span className="text-primary-text text-sm">{item.details.balanceAmount}</span>
                        :
                        <span className="text-primary-text text-sm">0.00</span>
                    }
                    {item.details.balanceAmountInUsd ?
                        <span className="text-sm">${item.details.balanceAmountInUsd}</span>
                        :
                        <span className="text-sm">$0.00</span>
                    }
                </p>
            }
        </div>
    </div>);
}