import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from 'react';
import { AddressBookItem } from "@/lib/apiClients/layerSwapApiClient";
import { isValidAddress } from "@/lib/address/validator";
import { Partner } from "@/Models/Partner";
import useWallet from "@/hooks/useWallet";
import { addressFormat } from "@/lib/address/formatter";
import ManualAddressInput from "./ManualAddressInput";
import ConnectWalletButton from "@/components/Common/ConnectWalletButton";
import { Network, NetworkRoute } from "@/Models/Network";
import AddressBook from "./AddressBook";
import AddressButton from "./AddressButton";
import { useInitialSettings } from "@/context/settings";
import ConnectedWallets from "./ConnectedWallets";
import { Wallet } from "@/types/wallet";
import { useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import VaulDrawer from "@/components/Modal/vaulModal";

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    RecentlyUsed = "Recently used",
    FromQuery = "Partner",
}

export type AddressItem = {
    address: string,
    group: AddressGroup,
    date?: string,
    wallet?: Wallet,
}

export type AddressTriggerProps = {
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partner?: Partner;
    destination: Network | undefined,
}

interface Input {
    children: (props: AddressTriggerProps) => JSX.Element;
    showAddressModal: boolean;
    setShowAddressModal: (show: boolean) => void;
    hideLabel?: boolean;
    name: string;
    close: () => void,
    partner?: Partner,
    canFocus?: boolean,
    address_book?: AddressBookItem[],
}

const AddressPicker: FC<Input> = forwardRef<HTMLInputElement, Input>(function Address
    ({ showAddressModal, setShowAddressModal, name, canFocus, close, address_book, partner, children }, ref) {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const initialSettings = useInitialSettings()
    const { destination_address, to: destination, toExchange } = values
    const selectDestinationAccount = useSelectSwapAccount("to");

    const { provider, unAvailableWallets } = useWallet(destination, 'autofill')
    const connectedWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []
    const defaultAccount = useSelectedAccount("to", values.to?.name);
    const connectedWalletskey = connectedWallets?.map(w => w.addresses.join('')).join('')
    const [manualAddress, setManualAddress] = useState<string>('')

    // Get manually added address from context (shared across all AddressPicker instances)
    const manualAddressFromContext = defaultAccount?.id === 'manually_added' ? defaultAccount.address : undefined

    useEffect(() => {
        if (destination_address && destination && !isValidAddress(destination_address, destination)) {
            updateDestAddress('');
            setManualAddress('');
        }
    }, [destination, destination_address])

    const inputReference = useRef<HTMLInputElement>(null);

    const groupedAddresses = useMemo(() => {
        return resolveAddressGroups({
            address_book,
            destination,
            wallets: connectedWallets,
            manualAddressFromContext,
            addressFromQuery: initialSettings.destination_address,
            destination_address
        })
    }, [address_book, destination, connectedWallets, manualAddressFromContext, initialSettings.destination_address, connectedWalletskey])

    const destinationAddressItem = destination && destination_address ?
        groupedAddresses?.find(a => a.address.toLowerCase() === destination_address.toLowerCase())
        : undefined

    const addressBookAddresses = groupedAddresses?.filter(a => a.group !== AddressGroup.ConnectedWallet)

    const connectedWallet = (destination && destination_address) ? connectedWallets?.find(w => w.addresses?.find(a => addressFormat(a, destination) === addressFormat(destination_address, destination))) : undefined

    const handleSelectAddress = useCallback((address: string) => {
        const selected = destination && groupedAddresses?.find(a => addressFormat(a.address, destination) === addressFormat(address, destination))
        const formattedAddress = selected?.address
        updateDestAddress(formattedAddress)
        close()
    }, [close, setFieldValue, groupedAddresses])

    const onConnect = (wallet: Wallet) => {
        setFieldValue('destination_address', wallet.address)
        selectDestinationAccount({
            address: wallet.address,
            id: wallet.id,
            providerName: wallet.providerName
        });
        close()
    }

    useEffect(() => {
        if (destinationAddressItem && !defaultAccount?.address && destinationAddressItem?.group == AddressGroup.ConnectedWallet) {
            updateDestAddress(undefined)
            return
        }
        if (destination_address?.toLowerCase() !== defaultAccount?.address?.toLowerCase() && (!destinationAddressItem || destinationAddressItem?.group === AddressGroup.ConnectedWallet)) {
            updateDestAddress(defaultAccount?.address)
            setShowAddressModal(false)
        }
    }, [defaultAccount?.address, destinationAddressItem])

    const updateDestAddress = useCallback((address: string | undefined) => {
        const wallet = destination && connectedWallets?.find(w => w.addresses?.find(a => addressFormat(a, destination) === addressFormat(address || '', destination)))
        setFieldValue('destination_address', address)

        if (destination && address && provider) {
            if (wallet)
                selectDestinationAccount({
                    address: address,
                    id: wallet.id,
                    providerName: wallet.providerName
                });
            else
                selectDestinationAccount({
                    address: address || "",
                    id: 'manually_added',
                    providerName: provider.name,
                });
        }
    }, [destination, connectedWallets, provider, selectDestinationAccount]);

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    return (
        <>
            <AddressButton
                addressItem={destinationAddressItem}
                openAddressModal={() => setShowAddressModal(true)}
                connectedWallet={connectedWallet}
                partner={partner}
                destination={destination}
            >{children({ destination, addressItem: destinationAddressItem, connectedWallet: connectedWallet, partner })}</AddressButton>
            <VaulDrawer
                header='Send To'
                show={showAddressModal}
                setShow={setShowAddressModal}
                modalId="address"
            >
                <VaulDrawer.Snap id="item-1">
                    <div className='w-full flex flex-col justify-between h-full text-primary-text min-h-[200px]'>
                        <div className='flex flex-col self-center grow w-full space-y-5 h-full'>

                            {
                                destination
                                && provider
                                && !connectedWallets.length &&
                                <ConnectWalletButton
                                    provider={provider}
                                    onConnect={onConnect}
                                />
                            }

                            <ManualAddressInput
                                manualAddress={manualAddress}
                                setManualAddress={setManualAddress}
                                setNewAddress={(props) => updateDestAddress(props?.address)}
                                values={values}
                                partner={partner}
                                name={name}
                                inputReference={inputReference}
                                setFieldValue={setFieldValue}
                                close={close}
                                addresses={groupedAddresses}
                                connectedWallet={connectedWallet}
                            />
                            {
                                destination
                                && provider
                                && !manualAddress &&
                                <ConnectedWallets
                                    provider={provider}
                                    notCompatibleWallets={unAvailableWallets}
                                    onClick={(props) => handleSelectAddress(props.address)}
                                    onConnect={onConnect}
                                    destination={destination}
                                    destination_address={destination_address}
                                />
                            }

                            {
                                addressBookAddresses && addressBookAddresses?.length > 0 && !manualAddress && destination &&
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
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
});

const resolveAddressGroups = ({
    address_book,
    destination,
    wallets,
    manualAddressFromContext,
    addressFromQuery,
    destination_address,
}: {
    address_book: AddressBookItem[] | undefined,
    destination: NetworkRoute | undefined,
    wallets: Wallet[] | undefined,
    manualAddressFromContext: string | undefined,
    addressFromQuery: string | undefined,
    destination_address: string | undefined,
}) => {

    if (!destination) return

    const filteredAddressBook = address_book?.filter(a => a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []
    const recentlyUsedAddresses = filteredAddressBook.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: destination.type }))

    let addresses: AddressItem[] = []
    wallets?.forEach(wallet => {
        if (wallet?.addresses?.length) {
            addresses.push(...(wallet.addresses.map(a => ({ address: a, group: AddressGroup.ConnectedWallet, wallet })) || []))
        }
    })
    if (addressFromQuery && isValidAddress(addressFromQuery, destination)) {
        addresses.push({ address: addressFromQuery, group: AddressGroup.FromQuery })
    }

    if (recentlyUsedAddresses.length > 0) {
        addresses = [...addresses, ...recentlyUsedAddresses]
    }

    // Include manually added address from context (shared across all instances)
    if (manualAddressFromContext && isValidAddress(manualAddressFromContext, destination)) {
        addresses.push({ address: manualAddressFromContext, group: AddressGroup.ManualAdded })
    }

    const uniqueAddresses = addresses.filter((a, index, self) => self.findIndex(t => addressFormat(t.address, destination) === addressFormat(a.address, destination)) === index)

    return uniqueAddresses
}

export default AddressPicker