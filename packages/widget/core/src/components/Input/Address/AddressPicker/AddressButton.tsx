import { type Wallet } from '@layerswap/widget-types';
import { FC } from "react"
import type { JSX } from 'react';
import { AddressItem } from ".";
import { Partner } from "@/Models/Partner";
import { Network } from "@layerswap/widget-types";
import { Slot } from '@radix-ui/react-slot';

type AddressButtonProps = {
    asChild?: boolean;
    openAddressModal: () => void;
    destination_address?: string;
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partner?: Partner;
    destination: Network | undefined,
    children: JSX.Element | JSX.Element[];
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, children, destination, asChild }) => {
    const Trigger = asChild ? Slot : 'button';
    return <Trigger type="button" aria-label="Select destination address" className="navigation-focus-ring-child w-full outline-hidden" onClick={openAddressModal} tabIndex={destination ? 0 : -1}>
        {children}
    </Trigger>
}

export default AddressButton
