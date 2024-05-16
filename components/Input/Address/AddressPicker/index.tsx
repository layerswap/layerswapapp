import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import KnownInternalNames from "../../../../lib/knownIds";
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

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    RecentlyUsed = "Recently used",
    FromQuery = "Partner",
}

export enum ExchangeType {
    Exchange = 'exchange'
}

export type AddressItem = {
    address: string,
    group: AddressGroup,
    networkType?: NetworkType | ExchangeType
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
    isPartnerWallet: boolean,
    partnerImage?: string,
    partner?: Partner,
    canFocus?: boolean,
    address_book?: AddressBookItem[],
    wrongNetwork?: boolean
}

const AddressPicker: FC<Input> = forwardRef<HTMLInputElement, Input>(function Address
    ({ showAddressModal, setShowAddressModal, name, canFocus, close, address_book, disabled, isPartnerWallet, partnerImage, partner, wrongNetwork }, ref) {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const inputReference = useRef<HTMLInputElement>(null);
    const { destination_address, to: destination, toExchange: destinationExchange, toCurrency: destinationAsset } = values

    const [manualAddress, setManualAddress] = useState<string>('')
    const [newAddress, setNewAddress] = useState<{ address: string, networkType: NetworkType | ExchangeType } | undefined>()
    const { connectWallet, getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const connectedWallet = provider?.getConnectedWallet()
    const connectedWalletAddress = connectedWallet?.address

    const menuItems = destination && generateMenuItems({ address_book, destination, destinationExchange, connectedWalletAddress, newAddress, currentAddress: destination_address, partner })

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    const handleSelectAddress = useCallback((value: string) => {
        const address = destination && menuItems?.find(a => addressFormat(a.address, destination) === addressFormat(value, destination))?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue])

    const filteredAddresses = menuItems?.filter(a => a.group !== AddressGroup.ConnectedWallet)
    const destinationAddressItem = destination && menuItems?.find(a => addressFormat(a.address, destination) === addressFormat(destination_address || '', destination))

    return (<>
        <AddressButton
            disabled={!values.to || !values.from || !!isPartnerWallet}
            isPartnerWallet={isPartnerWallet}
            addressItem={destinationAddressItem}
            openAddressModal={() => setShowAddressModal(true)}
            connectedWallet={connectedWallet}
            partnerImage={partnerImage}
        />
        <Modal
            header={
                <div className="w-full">
                    <span>To</span> <span>{(destinationExchange?.display_name ?? values?.to?.display_name) || ''}</span> <span>address</span>
                </div>
            }
            height="fit"
            show={showAddressModal} setShow={setShowAddressModal}
            modalId="address"
        >
            <ResizablePanel>
                <div className='w-full flex flex-col justify-between h-full text-primary-text pt-2 min-h-[400px]'>
                    <div className='flex flex-col self-center grow w-full'>
                        <div className='flex flex-col self-center grow w-full space-y-3'>

                            {
                                destinationExchange ?
                                    <ExchangeNote destination={destination} destinationAsset={destinationAsset} destinationExchange={destinationExchange} />
                                    :
                                    !disabled
                                    && destination
                                    && provider &&
                                    <ConnectWalletButton provider={provider} connectedWallet={connectedWallet} onClick={() => { connectedWallet ? handleSelectAddress(connectedWallet.address) : connectWallet(provider.name) }} destination={destination} destination_address={destination_address} />
                            }

                            {
                                wrongNetwork && !destination_address &&
                                <div className="basis-full text-xs text-primary">
                                    {
                                        destination?.name === KnownInternalNames.Networks.StarkNetMainnet
                                            ? <span>Please switch to Starknet Mainnet with your wallet and click Autofill again</span>
                                            : <span>Please switch to Starknet Sepolia with your wallet and click Autofill again</span>
                                    }
                                </div>
                            }

                            {
                                (destinationExchange || provider) &&
                                <hr className="border-secondary-500 w-full" />
                            }

                            <ManualAddressInput
                                manualAddress={manualAddress}
                                setManualAddress={setManualAddress}
                                setNewAddress={setNewAddress}
                                values={values}
                                partner={partner}
                                isPartnerWallet={isPartnerWallet}
                                partnerImage={partnerImage}
                                name={name}
                                inputReference={inputReference}
                                setFieldValue={setFieldValue}
                                close={close}
                            />

                            {
                                !disabled && filteredAddresses && filteredAddresses?.length > 0 && !manualAddress && destination &&
                                <AddressBook
                                    addressBook={filteredAddresses}
                                    onSelectAddress={handleSelectAddress}
                                    destination={destination}
                                    destination_address={destination_address}
                                />
                            }

                        </div>
                    </div>
                </div >
            </ResizablePanel>
        </Modal>
    </>
    )
});


const generateMenuItems = ({
    address_book,
    destination,
    destinationExchange,
    connectedWalletAddress,
    newAddress,
    currentAddress,
    partner
}: {
    address_book: AddressBookItem[] | undefined,
    destination: RouteNetwork | undefined,
    destinationExchange: Exchange | undefined,
    connectedWalletAddress: string | undefined,
    newAddress: { address: string, networkType: NetworkType | ExchangeType } | undefined,
    currentAddress: string | undefined,
    partner?: Partner,
}) => {
    const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.name === e) : a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []

    if (!destination) return

    let addresses: AddressItem[] = []

    if (recentlyUsedAddresses && destination) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => ra.address === a.address)), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: destinationExchange ? ExchangeType.Exchange : destination.type }))]
    if (connectedWalletAddress && destination) addresses = [...addresses.filter(a => addressFormat(connectedWalletAddress, destination) !== addressFormat(a.address, destination)), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: destination.type }]
    if (newAddress?.address && destination) addresses = [...addresses.filter(a => a.group !== AddressGroup.ManualAdded && addressFormat(newAddress.address, destination) !== addressFormat(a.address, destination)), { address: newAddress.address, date: new Date().toJSON(), group: AddressGroup.ManualAdded, networkType: newAddress.networkType }]
    if (partner && currentAddress && destination) addresses = [...addresses.filter(a => a.group !== AddressGroup.FromQuery && addressFormat(currentAddress, destination) !== addressFormat(a.address, destination)), { address: currentAddress, date: new Date().toJSON(), group: AddressGroup.ManualAdded, networkType: destination.type }]

    return addresses.filter(a => a.networkType === (destinationExchange ? ExchangeType.Exchange : destination?.type))

}

export default AddressPicker