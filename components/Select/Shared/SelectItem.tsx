import { ISelectMenuItem } from "./Props/selectMenuItem";

export default function SelectItem({ item }: { item: ISelectMenuItem }) {

    return (
        <div className={`${item.noWalletsConnectedText ? "group-hover:bg-secondary-500" : "hover:bg-secondary-500 "} flex items-center justify-between w-full overflow-hidden rounded-md p-1.5`}>
            <div className="relative flex items-center gap-1.5">
                <div className="flex-shrink-0">
                    {item.logo}
                </div>
                <p className="text-md font-medium flex w-full justify-between space-x-2 items-center">
                    <span className="flex items-center justify-center pb-0.5">
                        {item.menuItemImage && item.menuItemImage}
                        {item.menuItemLabel ?
                            <span className="flex space-x-1">
                                {item.menuItemLabel}
                                {item?.extendedAddress && <span className="self-end hidden group-hover:block">{item?.extendedAddress}</span>}
                            </span>
                            :
                            item.name}
                    </span>
                    {item.badge && <span>{item.badge}</span>}
                </p>
            </div>
            <div>
                {item.menuItemDetails && item.menuItemDetails}
            </div>
            {item.noWalletsConnectedText && (
                <div className="hidden group-hover:block">
                    <span>{item.noWalletsConnectedText}</span>
                </div>
            )}
        </div>
    );
}