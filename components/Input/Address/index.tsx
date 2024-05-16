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
import { useQueryState } from "../../../context/query"
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap"
import useWallet from "../../../hooks/useWallet"

type AddressProps = {
    isPartnerWallet: boolean
    partner: Partner | undefined
}

const Address = ({ isPartnerWallet, partner }: AddressProps) => {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { authData } = useAuthState()
    const query = useQueryState();
    const { setDepositAddressIsFromAccount } = useSwapDataUpdate()
    const { depositAddressIsFromAccount } = useSwapDataState()
    const { to: destination, destination_address, toExchange } = values

    const layerswapApiClient = new LayerSwapApiClient()
    const address_book_endpoint = authData?.access_token ? `/internal/recent_addresses` : null
    const { data: address_book } = useSWR<ApiResponse<AddressBookItem[]>>(address_book_endpoint, layerswapApiClient.fetcher, { dedupingInterval: 60000 })

    const [showAddressModal, setShowAddressModal] = useState(false);
    const partnerImage = partner?.logo
    const lockAddress =
        (values.destination_address && values.to)
        && isValidAddress(values.destination_address, values.to)
        && (((query.lockAddress || query.hideAddress) && (query.appName !== "imxMarketplace")))

    const previouslySelectedDestination = useRef(destination);
    const depositAddressIsFromAccountRef = useRef<boolean | null | undefined>(depositAddressIsFromAccount);

    useEffect(() => {
        depositAddressIsFromAccountRef.current = depositAddressIsFromAccount
        return () => { (depositAddressIsFromAccountRef.current = null); return }
    }, [depositAddressIsFromAccount])

    useEffect(() => {
        if ((previouslySelectedDestination.current &&
            (destination?.type != previouslySelectedDestination.current?.type)
            || destination && !isValidAddress(values.destination_address, destination)) && !lockAddress) {
            setFieldValue("destination_address", '')
            setDepositAddressIsFromAccount(false)
        }
        previouslySelectedDestination.current = destination
    }, [destination])

    //If destination exchange changed, remove destination_address
    useEffect(() => {
        setFieldValue("destination_address", '')
    }, [toExchange])

    const { disconnectWallet, getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const connectedWallet = provider?.getConnectedWallet()
    const [wrongNetwork, setWrongNetwork] = useState(false)

    //If wallet connected set address from wallet
    useEffect(() => {
        if (destination && connectedWallet?.address && isValidAddress(connectedWallet?.address, destination) && !toExchange) {
            //TODO move to wallet implementation
            if (connectedWallet
                && connectedWallet.providerName === 'starknet'
                && (connectedWallet.chainId != destination.chain_id)
                && destination) {
                (async () => {
                    setWrongNetwork(true)
                    await disconnectWallet(connectedWallet.providerName)
                })()
                return
            }
            setFieldValue("destination_address", connectedWallet?.address)
            if (showAddressModal) setShowAddressModal(false)
        }
    }, [connectedWallet?.address, destination])

    return (
        <div className="w-full mb-3.5 leading-4">
            <label htmlFor="destination_address" className="block font-semibold text-secondary-text text-xs">
                Send To
            </label>
            <AddressPicker
                showAddressModal={showAddressModal}
                setShowAddressModal={setShowAddressModal}
                close={() => setShowAddressModal(false)}
                disabled={lockAddress || (!values.to || !values.from)}
                name={"destination_address"}
                partnerImage={partnerImage}
                isPartnerWallet={!!isPartnerWallet}
                partner={partner}
                address_book={address_book?.data}
                wrongNetwork={wrongNetwork}
            />
        </div>
    )
}

export default Address