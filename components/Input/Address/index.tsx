import { FC, useEffect, useMemo, useRef, useState } from "react"
import { SwapFormValues } from "../../DTOs/SwapFormValues"
import shortenAddress from "../../utils/ShortenAddress"
import Image from "next/image"
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
import { ChevronRight } from "lucide-react"
import AddressIcon from "../../AddressIcon"

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
    const { setDepositAddressIsFromAccount: setDepositeAddressIsfromAccount } = useSwapDataUpdate()
    const { depositAddressIsFromAccount: depositeAddressIsfromAccount } = useSwapDataState()
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
    const depositAddressIsFromAccountRef = useRef<boolean | null>(depositeAddressIsfromAccount);

    useEffect(() => {
        depositAddressIsFromAccountRef.current = depositeAddressIsfromAccount
        return () => { (depositAddressIsFromAccountRef.current = null); return }
    }, [depositeAddressIsfromAccount])

    useEffect(() => {
        if ((previouslySelectedDestination.current &&
            (destination?.type != previouslySelectedDestination.current?.type)
            || destination && !isValidAddress(values.destination_address, destination)) && !lockAddress) {
            setFieldValue("destination_address", '')
            setDepositeAddressIsfromAccount(false)
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
        if (destination && connectedWallet?.address && isValidAddress(connectedWallet?.address, destination) && !values?.destination_address && !toExchange) {
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
                {`To ${(values.toExchange?.display_name ?? values?.to?.display_name) || ''} address`}
            </label>
            <AddressButton
                disabled={!values.to || !values.from}
                isPartnerWallet={isPartnerWallet}
                address={destination_address}
                openAddressModal={() => setShowAddressModal(true)}
                partnerImage={partnerImage}
                values={values} />

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

const TruncatedAdrress = ({ address }: { address: string }) => {
    const shortAddress = shortenAddress(address)
    return <div className="tracking-wider text-primary-buttonTextColor">{shortAddress}</div>
}

type AddressButtonProps = {
    openAddressModal: () => void;
    isPartnerWallet: boolean;
    values: SwapFormValues;
    address?: string;
    partnerImage?: string;
    disabled: boolean;
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, isPartnerWallet, values, address, partnerImage, disabled }) => {
    return <button type="button" disabled={disabled} onClick={openAddressModal} className="flex rounded-lg justify-between space-x-3 items-center cursor-pointer shadow-sm mt-1.5 text-primary-text-placeholder bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary font-medium w-full px-3.5 py-3">
        <div>
            {isPartnerWallet && address &&
                <div className="shrink-0 flex items-center pointer-events-none">
                    {
                        partnerImage &&
                        <Image
                            alt="Partner logo"
                            className='rounded-md object-contain'
                            src={partnerImage}
                            width="24"
                            height="24"></Image>
                    }
                </div>
            }
            <div className="truncate">
                {values.destination_address ?
                    <div className="flex items-center gap-2">
                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-8 overflow-hidden w-8'>
                            <AddressIcon className="scale-150 h-8 w-8" address={values.destination_address} size={32} />
                        </div>
                        <TruncatedAdrress address={values.destination_address} />
                    </div>
                    :
                    <span>Address</span>
                }
            </div>
        </div>
        <ChevronRight className="h-4 w-4 text-primary-buttonTextColor" />
    </button>
}


export default Address