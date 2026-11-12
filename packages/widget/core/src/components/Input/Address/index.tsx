import { useState } from "react"
import type { JSX } from 'react';
import { Partner } from "@/Models/Partner"
import AddressPicker, { AddressTriggerProps } from "./AddressPicker"

type AddressProps = {
    triggerAsChild?: boolean;
    children: (props: AddressTriggerProps) => JSX.Element;
    partner: Partner | undefined
}

const Address = ({ partner, children, triggerAsChild }: AddressProps) => {
    const [showAddressModal, setShowAddressModal] = useState(false);

    return (
        <AddressPicker
            triggerAsChild={triggerAsChild}
            showAddressModal={showAddressModal}
            setShowAddressModal={setShowAddressModal}
            close={() => setShowAddressModal(false)}
            name={"destination_address"}
            partner={partner}
        >
            {children}
        </AddressPicker>
    )
}

export default Address
