import { useState } from "react"
import { Partner } from "@/Models/Partner"
import AddressPicker, { AddressTriggerProps } from "./AddressPicker"
type AddressProps = {
    children: (props: AddressTriggerProps) => JSX.Element;
    partner: Partner | undefined
}

const Address = ({ partner, children }: AddressProps) => {
    const [showAddressModal, setShowAddressModal] = useState(false);

    return (
        <AddressPicker
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