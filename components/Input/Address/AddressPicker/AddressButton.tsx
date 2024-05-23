import { FC } from "react"
import { ChevronRight } from "lucide-react";
import { AddressItem } from ".";
import { Wallet } from "../../../../stores/walletStore";
import AddressWithIcon from "./AddressWithIcon";

type AddressButtonProps = {
    openAddressModal: () => void;
    isPartnerWallet: boolean;
    destination_address?: string;
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partnerImage?: string;
    disabled: boolean;
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, isPartnerWallet, addressItem, connectedWallet, partnerImage, disabled }) => {
    return <button type="button" disabled={disabled} onClick={openAddressModal} className="flex rounded-lg justify-between space-x-3 items-center cursor-pointer shadow-sm mt-1.5 text-primary-text bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary font-medium w-full px-3 py-7">
        <div className="truncate">
            {addressItem ?
                <AddressWithIcon
                    addressItem={addressItem}
                    connectedWallet={connectedWallet}
                    isPartnerWallet={isPartnerWallet}
                    partnerImage={partnerImage}
                />
                :
                <span>Address</span>
            }
        </div>
        {
            !disabled &&
            <ChevronRight className="h-4 w-4 text-primary-buttonTextColor" />
        }
    </button>
}

export default AddressButton