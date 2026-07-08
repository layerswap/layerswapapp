import { FC } from "react";
import clsx from "clsx";
import { AddressItem } from ".";
import { NetworkRoute } from "@/Models/Network";
import { Partner } from "@/Models/Partner";
import AddressWithIcon from "./AddressWithIcon";
import FilledCheck from "@/components/icons/FilledCheck";
type Props = {
    item: AddressItem;
    network?: NetworkRoute;
    partner?: Partner;
    selected?: boolean;
    onRemove?: () => void;
    onClick?: () => void;
    className?: string;
}

const AddressPickerItem: FC<Props> = ({ item, network, partner, selected, onRemove, onClick, className }) => (
    <div onClick={onClick} className={clsx('group/addressItem w-full flex items-center justify-between gap-2 rounded-lg bg-secondary-500 p-3 transition duration-200 hover:bg-secondary-400 cursor-pointer', selected && 'bg-secondary-400', className)}>
        <AddressWithIcon addressItem={item} partner={partner} network={network} onRemove={onRemove} />
        {selected && <div className="flex h-6 items-center px-1"><FilledCheck /></div>}
    </div>
)

export default AddressPickerItem
