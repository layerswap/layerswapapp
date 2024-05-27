import { FC } from "react"
import { ChevronRight } from "lucide-react";
import { AddressItem } from ".";
import { Wallet } from "../../../../stores/walletStore";
import AddressWithIcon from "./AddressWithIcon";
import { Partner } from "../../../../Models/Partner";
import { Network } from "../../../../Models/Network";

type AddressButtonProps = {
    openAddressModal: () => void;
    destination_address?: string;
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partner?: Partner;
    disabled: boolean;
    destination: Network | undefined
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, addressItem, connectedWallet, partner, disabled, destination }) => {
    return <button type="button" disabled={disabled} onClick={openAddressModal} className="group/addressItem flex rounded-lg justify-between space-x-3 items-center cursor-pointer shadow-sm mt-1.5 text-primary-text bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary font-medium w-full px-3 py-7">
        <div className="truncate">
            {(addressItem && destination) ?
                <AddressWithIcon
                    addressItem={addressItem}
                    connectedWallet={connectedWallet}
                    partner={partner}
                    destination={destination}
                />
                :
                <span className="text-secondary-text">Address</span>
            }
        </div>
        {
            !disabled &&
            <ChevronRight className="h-4 w-4 text-primary-buttonTextColor" />
        }
    </button>
}

export default AddressButton