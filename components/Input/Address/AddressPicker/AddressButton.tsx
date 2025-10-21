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

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, children }) => {
    return <button type="button" className="w-full outline-hidden" onClick={openAddressModal} >
        {children}
    </button>
}

export default AddressButton