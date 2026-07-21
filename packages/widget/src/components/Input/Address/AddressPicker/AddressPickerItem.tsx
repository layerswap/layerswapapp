import { FC } from "react";
import clsx from "clsx";
import { AddressItem } from ".";
import { NetworkRoute } from "@/Models/Network";
import { Partner } from "@/Models/Partner";
import AddressWithIcon from "./AddressWithIcon";
import FilledCheck from "@/components/Icons/FilledCheck";
type Props = {
    item: AddressItem;
    network?: NetworkRoute;
    partner?: Partner;
    selected?: boolean;
    onRemove?: () => void;
    onClick?: () => void;
    className?: string;
}

// Not a native <button>: AddressWithIcon renders its own interactive
// popover/action buttons, which may not be nested inside a button element.
const AddressPickerItem: FC<Props> = ({ item, network, partner, selected, onRemove, onClick, className }) => (
    <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onClick}
        onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
            }
        }}
        className={clsx('group/addressItem w-full flex items-center justify-between gap-2 rounded-lg bg-secondary-500 p-3 transition duration-200 hover:bg-secondary-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500', selected && 'bg-secondary-400', className)}
    >
        <AddressWithIcon addressItem={item} partner={partner} network={network} onRemove={onRemove} />
        {selected && <div className="flex h-6 items-center px-1"><FilledCheck /></div>}
    </div>
)

export default AddressPickerItem
