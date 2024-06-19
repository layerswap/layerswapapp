import { CurrencyDisabledReason } from "../../Input/CurrencyFormField";
import UnavailableIcon from "../../icons/UnavailableIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shadcn/tooltip";
import { LayerDisabledReason } from "../Popover/PopoverSelect";
import { ISelectMenuItem } from "./Props/selectMenuItem";
import Image from 'next/image'

export default function SelectItem({ item }: { item: ISelectMenuItem }) {
    return (<div className={`flex items-center justify-between gap-4  w-full overflow-hidden`}>
        <div className="flex items-center gap-3">
            {(item?.isAvailable?.disabledReason == CurrencyDisabledReason.InvalidRoute || item?.isAvailable?.disabledReason == LayerDisabledReason.LockNetworkIsTrue) ?
                <Tooltip>
                    <TooltipTrigger>
                        <UnavailableIcon />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-72">Transfers from selected network/asset are not supported by this network.</p>
                    </TooltipContent>
                </Tooltip>
                :
                <span className="w-7"></span>
            }
            <div className="flex-shrink-0 h-6 w-6 relative">
                {item.imgSrc && <Image
                    src={item.imgSrc}
                    alt="Project Logo"
                    height="40"
                    width="40"
                    loading="eager"
                    className="rounded-md object-contain" />}
            </div>
            <p className='text-md font-medium flex w-full justify-between space-x-2 '>
                <span className="flex items-center justify-center pb-0.5">{item.displayName ? item.displayName : item.name}</span>
                {item.badge}
            </p>
        </div>
        {
            item.details &&
            <>
                {item.details}
            </>
        }
    </div>);
}