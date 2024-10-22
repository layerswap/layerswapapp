import { FC, useEffect, useRef, useState } from "react"
import { SwapFormValues } from "../../DTOs/SwapFormValues"
import { useFormikContext } from "formik"
import { Partner } from "../../../Models/Partner"
import AddressPicker, { AddressTriggerProps } from "./AddressPicker"
import useSWR from "swr"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { AddressBookItem } from "../../../lib/layerSwapApiClient"
import { useAuthState } from "../../../context/authContext"
import { isValidAddress } from "../../../lib/address/validator"
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap"

type AddressProps = {
    children: (props: AddressTriggerProps) => JSX.Element;
    partner: Partner | undefined
}

const Address = ({ partner, children }: AddressProps) => {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { authData } = useAuthState()
    const { setDepositAddressIsFromAccount } = useSwapDataUpdate()
    const { depositAddressIsFromAccount } = useSwapDataState()
    const { to: destination, toExchange, destination_address } = values

    const layerswapApiClient = new LayerSwapApiClient()
    const address_book_endpoint = authData?.access_token ? `/internal/recent_addresses` : null
    const { data: address_book } = useSWR<ApiResponse<AddressBookItem[]>>(address_book_endpoint, layerswapApiClient.fetcher, { dedupingInterval: 60000 })

    const [showAddressModal, setShowAddressModal] = useState(false);

    const previouslySelectedDestination = useRef(destination);
    const depositAddressIsFromAccountRef = useRef<boolean | null | undefined>(depositAddressIsFromAccount);

    // useEffect(() => {
    //     depositAddressIsFromAccountRef.current = depositAddressIsFromAccount
    //     return () => { (depositAddressIsFromAccountRef.current = null); return }
    // }, [depositAddressIsFromAccount])

    // useEffect(() => {   
    //     if ((previouslySelectedDestination.current &&
    //         (destination?.type != previouslySelectedDestination.current?.type)
    //         || destination && !isValidAddress(values.destination_address, destination))) {
    //         debugger
    //         setFieldValue("destination_address", '')
    //         setDepositAddressIsFromAccount(false)
    //     }
    //     previouslySelectedDestination.current = destination
    // }, [destination])

    const previouslySelectedDestinationExchange = useRef(toExchange);

    // //If destination exchange changed, remove destination_address
    // useEffect(() => {
    //     if (previouslySelectedDestinationExchange.current && (toExchange?.name != previouslySelectedDestinationExchange.current?.name)) {
    //         debugger
    //         setFieldValue("destination_address", '')
    //     }
    //     previouslySelectedDestinationExchange.current = toExchange
    // }, [toExchange])

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