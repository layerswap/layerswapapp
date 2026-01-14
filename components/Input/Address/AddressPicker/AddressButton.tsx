import { FC } from "react"
import { AddressItem } from ".";
import { Partner } from "@/Models/Partner";
import { Network } from "@/Models/Network";
import { Wallet } from "@/Models/WalletProvider";

type AddressButtonProps = {
    openAddressModal: () => void;
    destination_address?: string;
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partner?: Partner;
    destination: Network | undefined,
    children: JSX.Element | JSX.Element[];
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, children, destination }) => {
    return <button type="button" className="navigation-focus-ring-child w-full outline-hidden" onClick={openAddressModal} tabIndex={destination ? 0 : -1}>
        {children}
    </button>
}

export default AddressButton