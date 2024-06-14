import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import { isValidAddress } from "../../../../lib/address/validator";
import { Partner } from "../../../../Models/Partner";
import useWallet from "../../../../hooks/useWallet";
import { addressFormat } from "../../../../lib/address/formatter";
import ManualAddressInput from "./ManualAddressInput";
import Modal from "../../../modal/modal";
import ResizablePanel from "../../../ResizablePanel";
import ConnectWalletButton from "./ConnectWalletButton";
import ExchangeNote from "./ExchangeNote";
import { NetworkType, RouteNetwork } from "../../../../Models/Network";
import { Exchange } from "../../../../Models/Exchange";
import AddressBook from "./AddressBook";
import AddressButton from "./AddressButton";
import { useQueryState } from "../../../../context/query";

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    RecentlyUsed = "Recently used",
    FromQuery = "Partner",
}

export type AddressItem = {
    address: string,
    group: AddressGroup,
    date?: string
}

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    showAddressModal: boolean;
    setShowAddressModal: (show: boolean) => void;
    hideLabel?: boolean;
    disabled: boolean;
    name: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    close: () => void,
    partner?: Partner,
    canFocus?: boolean,
    address_book?: AddressBookItem[],
}

const AddressPicker: FC<Input> = forwardRef<HTMLInputElement, Input>(function Address
    ({ showAddressModal, setShowAddressModal, name, canFocus, close, address_book, disabled, partner }, ref) {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const query = useQueryState()
    const { destination_address, to: destination, toExchange: destinationExchange, toCurrency: destinationAsset } = values

    const { getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])
    const connectedWallet = provider?.getConnectedWallet()
    const connectedWalletAddress = connectedWallet?.address

    const [isConnecting, setIsConnecting] = useState(false)
    const [manualAddress, setManualAddress] = useState<string>('')
    const [newAddress, setNewAddress] = useState<{ address: string, networkType: NetworkType | string } | undefined>()

    const inputReference = useRef<HTMLInputElement>(null);

    const groupedAddresses = destination && resolveAddressGroups({ address_book, destination, destinationExchange, connectedWalletAddress, newAddress, addressFromQuery: query.destAddress, partner })
    const destinationAddressItem = destination && destination_address ? groupedAddresses?.find(a => addressFormat(a.address, destination) === addressFormat(destination_address, destination)) : undefined
    const addressBookAddresses = groupedAddresses?.filter(a => a.group !== AddressGroup.ConnectedWallet)

    const handleSelectAddress = useCallback((value: string) => {
        const address = destination && groupedAddresses?.find(a => addressFormat(a.address, destination) === addressFormat(value, destination))?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue, groupedAddresses])

    const autofillConnectedWallet = useCallback(() => {
        setFieldValue("destination_address", connectedWallet?.address)
        if (showAddressModal && connectedWallet) setShowAddressModal(false)

    }, [setFieldValue, setShowAddressModal, showAddressModal, destination, connectedWallet])

    useEffect(() => {
        if (!destination_address && connectedWallet) {
            autofillConnectedWallet()
        } else if (isConnecting && connectedWallet) {
            setIsConnecting(false)
            autofillConnectedWallet()
        }
    }, [destination_address, connectedWallet, isConnecting])

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    return (<>
        <AddressButton
            disabled={!values.to || !values.from}
            addressItem={destinationAddressItem}
            openAddressModal={() => setShowAddressModal(true)}
            connectedWallet={connectedWallet}
            partner={partner}
            destination={destination}
        />
        <Modal
            header='Send To'
            height="fit"
            show={showAddressModal} setShow={setShowAddressModal}
            modalId="address"
        >
            <ResizablePanel>
                <div className='w-full flex flex-col justify-between h-full text-primary-text pt-2 min-h-[400px]'>
                    <div className='flex flex-col self-center grow w-full'>
                        <div className='flex flex-col self-center grow w-full space-y-5'>

                            <ManualAddressInput
                                manualAddress={manualAddress}
                                setManualAddress={setManualAddress}
                                setNewAddress={setNewAddress}
                                values={values}
                                partner={partner}
                                name={name}
                                inputReference={inputReference}
                                setFieldValue={setFieldValue}
                                close={close}
                                addresses={groupedAddresses}
                                connectedWallet={connectedWallet}
                            />

                            <div className="space-y-4">

                                {
                                    destinationExchange ?
                                        <ExchangeNote destination={destination} destinationAsset={destinationAsset} destinationExchange={destinationExchange} />
                                        :
                                        !disabled
                                        && destination
                                        && provider
                                        && !manualAddress &&
                                        <ConnectWalletButton provider={provider} connectedWallet={connectedWallet} onClick={() => { connectedWallet && handleSelectAddress(connectedWallet.address) }} onConnect={() => setIsConnecting(true)} destination={destination} destination_address={destination_address} />
                                }

                                {
                                    !disabled && addressBookAddresses && addressBookAddresses?.length > 0 && !manualAddress && destination &&
                                    <AddressBook
                                        addressBook={addressBookAddresses}
                                        onSelectAddress={handleSelectAddress}
                                        destination={destination}
                                        destination_address={destination_address}
                                        partner={partner}
                                    />
                                }

                            </div>

                        </div>
                    </div>
                </div >
            </ResizablePanel>
        </Modal>
    </>
    )
});

const resolveAddressGroups = ({
    address_book,
    destination,
    destinationExchange,
    connectedWalletAddress,
    newAddress,
    addressFromQuery,
    partner
}: {
    address_book: AddressBookItem[] | undefined,
    destination: RouteNetwork | undefined,
    destinationExchange: Exchange | undefined,
    connectedWalletAddress: string | undefined,
    newAddress: { address: string, networkType: NetworkType | string } | undefined,
    addressFromQuery: string | undefined,
    partner?: Partner,
}) => {

    if (!destination) return

    const filteredAddressBook = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.name === e) : a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []
    const recentlyUsedAddresses = filteredAddressBook.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: destinationExchange ? destinationExchange.name : destination.type }))

    const networkType = destinationExchange ? destinationExchange.name : destination?.type

    let addresses: AddressItem[] = []

    if (partner && addressFromQuery) {
        addresses.push({ address: addressFromQuery, group: AddressGroup.FromQuery })
    }

    if (connectedWalletAddress) {
        addresses.push({ address: connectedWalletAddress, group: AddressGroup.ConnectedWallet })
    }

    if (recentlyUsedAddresses.length > 0) {
        addresses = [...addresses, ...recentlyUsedAddresses]
    }

    if (newAddress?.address && newAddress.networkType === networkType) {
        addresses.push({ address: newAddress.address, group: AddressGroup.ManualAdded })
    }

    const uniqueAddresses = addresses.filter((a, index, self) => self.findIndex(t => addressFormat(t.address, destination) === addressFormat(a.address, destination)) === index)

    return uniqueAddresses
}

export default AddressPicker