import { useState } from "react"
import { SwapFormValues } from "../../Pages/SwapPages/Form/SwapFormValues"
import { useFormikContext } from "formik"
import { Partner } from "../../../Models/Partner"
import AddressPicker, { AddressTriggerProps } from "./AddressPicker"
import useSWR from "swr"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { AddressBookItem } from "../../../lib/layerSwapApiClient"
import { useAuthState } from "../../../context/authContext"

type AddressProps = {
    children: (props: AddressTriggerProps) => JSX.Element;
    partner: Partner | undefined
}

const Address = ({ partner, children }: AddressProps) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { authData } = useAuthState()


    const layerswapApiClient = new LayerSwapApiClient()
    const address_book_endpoint = authData?.access_token ? `/internal/recent_addresses` : null
    const { data: address_book } = useSWR<ApiResponse<AddressBookItem[]>>(address_book_endpoint, layerswapApiClient.fetcher, { dedupingInterval: 60000 })

    const [showAddressModal, setShowAddressModal] = useState(false);

    return (
        <AddressPicker
            showAddressModal={showAddressModal}
            setShowAddressModal={setShowAddressModal}
            close={() => setShowAddressModal(false)}
            disabled={!values.to}
            name={"destination_address"}
            partner={partner}
            address_book={address_book?.data}
        >
            {children}
        </AddressPicker>
    )
}

export default Address