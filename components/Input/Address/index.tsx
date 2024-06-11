import { useEffect, useMemo, useRef, useState } from "react"
import { SwapFormValues } from "../../DTOs/SwapFormValues"
import { useFormikContext } from "formik"
import { Partner } from "../../../Models/Partner"
import AddressPicker from "./AddressPicker"
import useSWR from "swr"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { AddressBookItem } from "../../../lib/layerSwapApiClient"
import { useAuthState } from "../../../context/authContext"
import { isValidAddress } from "../../../lib/address/validator"
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap"
import AddressNoteModal from "./AddressNote"

type AddressProps = {
    partner: Partner | undefined
}

const Address = ({ partner }: AddressProps) => {

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
    const [showAddressNoteModal, setShowAddressNoteModal] = useState(true);

    const previouslySelectedDestination = useRef(destination);
    const depositAddressIsFromAccountRef = useRef<boolean | null | undefined>(depositAddressIsFromAccount);

    useEffect(() => {
        depositAddressIsFromAccountRef.current = depositAddressIsFromAccount
        return () => { (depositAddressIsFromAccountRef.current = null); return }
    }, [depositAddressIsFromAccount])

    useEffect(() => {
        if ((previouslySelectedDestination.current &&
            (destination?.type != previouslySelectedDestination.current?.type)
            || destination && !isValidAddress(values.destination_address, destination))) {
            setFieldValue("destination_address", '')
            setDepositAddressIsFromAccount(false)
        }
        previouslySelectedDestination.current = destination
    }, [destination])

    const previouslySelectedDestinationExchange = useRef(toExchange);

    //If destination exchange changed, remove destination_address
    useEffect(() => {
        if (previouslySelectedDestinationExchange.current && (toExchange?.name != previouslySelectedDestinationExchange.current?.name)) {
            setFieldValue("destination_address", '')
        }
        previouslySelectedDestinationExchange.current = toExchange
    }, [toExchange])

    return (
        <>
            <div className="w-full mb-3.5 leading-4">
                <label htmlFor="destination_address" className="block font-semibold text-secondary-text text-xs">
                    Send To
                </label>
                <AddressPicker
                    showAddressModal={showAddressModal}
                    setShowAddressModal={setShowAddressModal}
                    close={() => setShowAddressModal(false)}
                    disabled={!values.to || !values.from}
                    name={"destination_address"}
                    partner={partner}
                    address_book={address_book?.data}
                />
            </div>
            {
                destination && destination_address &&
                <AddressNoteModal openModal={showAddressNoteModal} setOpenModal={setShowAddressNoteModal} destination={destination} destination_address={destination_address} />
            }
        </>
    )
}

export default Address