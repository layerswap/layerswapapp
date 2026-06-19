import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Partner } from "@/Models/Partner";
import useWallet from "@/hooks/useWallet";
import { Address as AddressClass } from "@/lib/address";
import ManualAddressInput from "./ManualAddressInput";
import VaulDrawer from "@/components/modal/vaulModal";
import ConnectWalletButton from "@/components/Common/ConnectWalletButton";
import { Network, NetworkRoute } from "@/Models/Network";
import AddressBook from "./AddressBook";
import AddressButton from "./AddressButton";
import { useQueryState } from "@/context/query";
import ConnectedWallets, { NotCompatibleWallets } from "./ConnectedWallets";
import { Wallet } from "@/Models/WalletProvider";
import { ManualDestAddress, useManualDestAddresses, useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import { SavedAddress, savedAddressMatchesNetwork, useAddressBookStore } from "@/stores/addressBookStore";
import { useManualDestAddressesStore } from "@/stores/manualDestAddressesStore";

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    FromQuery = "Partner",
}

export type AddressItem = {
    address: string,
    group: AddressGroup,
    wallet?: Wallet,
    providerName?: string,
}

export type AddressTriggerProps = {
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partner?: Partner;
    destination: Network | undefined,
}

interface Input {
    children?: (props: AddressTriggerProps) => JSX.Element;
    showAddressModal: boolean;
    setShowAddressModal: (show: boolean) => void;
    hideLabel?: boolean;
    name: string;
    close: () => void,
    partner?: Partner,
    canFocus?: boolean,
    /** Render the picker content directly (no trigger button, no drawer). */
    inline?: boolean,
    /** When true, skip the effect that syncs destination_address from the
     *  connected wallet's default account. Used by the inline deposit-address
     *  flow after the user explicitly clears the chosen address — otherwise
     *  re-mounting the picker would immediately re-fill it. */
    disableAutoFill?: boolean,
}

const AddressPicker: FC<Input> = forwardRef<HTMLInputElement, Input>(function Address
    ({ showAddressModal, setShowAddressModal, name, canFocus, close, partner, children, inline, disableAutoFill }, ref) {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const query = useQueryState()
    const { destination_address, to: destination, toExchange } = values
    const selectDestinationAccount = useSelectSwapAccount("to");

    const { provider, unAvailableWallets } = useWallet(destination, 'autofill')
    const connectedWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []
    const defaultAccount = useSelectedAccount("to", values.to?.name);
    const connectedWalletskey = connectedWallets?.map(w => w.addresses.join('')).join('')
    const [manualAddress, setManualAddress] = useState<string>('')
    const [isConnecting, setIsConnecting] = useState(false)
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)

    const manualDestAddresses = useManualDestAddresses()
    const removeManualDestAddress = useManualDestAddressesStore(s => s.removeManualDestAddress)
    const removeAddressFromBook = useAddressBookStore(s => s.removeAddress)

    const onRemoveAddress = useCallback((address: string, isBookEntry: boolean) => {
        if (isBookEntry) {
            removeAddressFromBook(address)
        }
        if (provider?.name) {
            removeManualDestAddress(address, provider.name)
        }
    }, [removeAddressFromBook, provider?.name, removeManualDestAddress])

    useEffect(() => {
        if (destination_address && destination && !AddressClass.isValid(destination_address, destination)) {
            updateDestAddress('');
            setManualAddress('');
        }
    }, [destination, destination_address, toExchange])

    const inputReference = useRef<HTMLInputElement>(null);

    const groupedAddresses = useMemo(() => {
        return resolveAddressGroups({
            destination,
            wallets: connectedWallets,
            savedAddresses,
            manualAddresses: manualDestAddresses,
            addressFromQuery: query.destination_address,
            providerName: provider?.name,
        })
    }, [destination, connectedWallets, savedAddresses, manualDestAddresses, query.destination_address, connectedWalletskey, provider?.name])

    const destinationAddressItem = destination && destination_address ?
        groupedAddresses?.find(a => a.address.toLowerCase() === destination_address.toLowerCase())
        : undefined

    const addressBookAddresses = groupedAddresses?.filter(a => a.group !== AddressGroup.ConnectedWallet)

    const incompatibleAddressBook = useMemo<AddressItem[]>(
        () => destination
            ? savedAddresses
                .filter(e => !(savedAddressMatchesNetwork(e, destination) && AddressClass.isValid(e.address, destination)))
                .map(e => ({ address: e.address, group: AddressGroup.ManualAdded, providerName: e.networkTypes?.[0] }))
            : [],
        [savedAddresses, destination]
    )

    const normalizedDestAddress = useMemo(
        () => destination && destination_address
            ? new AddressClass(destination_address, destination).normalized
            : null,
        [destination_address, destination]
    );

    const connectedWallet = (destination && normalizedDestAddress)
        ? connectedWallets?.find(w =>
            w.addresses?.some(a =>
                new AddressClass(a, destination).normalized === normalizedDestAddress
            )
        )
        : undefined;

    const handleSelectAddress = useCallback((address: string) => {
        const selected = destination && groupedAddresses?.find(a => AddressClass.equals(a.address, address, destination))
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
        if (disableAutoFill) return
        if (destinationAddressItem && !defaultAccount?.address && destinationAddressItem?.group == AddressGroup.ConnectedWallet) {
            updateDestAddress(undefined)
            return
        }
        if (destination_address?.toLowerCase() !== defaultAccount?.address?.toLowerCase() && (!destinationAddressItem || destinationAddressItem?.group === AddressGroup.ConnectedWallet)) {
            updateDestAddress(defaultAccount?.address)
            setShowAddressModal(false)
        }
    }, [defaultAccount?.address, destinationAddressItem, disableAutoFill])

    const updateDestAddress = useCallback((address: string | undefined) => {
        const wallet = destination && connectedWallets?.find(w => w.addresses?.some(a => AddressClass.equals(a, address || '', destination)))
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

    const pickerBody = (
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
                        onClick={(props) => handleSelectAddress(props.address)}
                        onConnect={onConnect}
                        destination={destination}
                        destination_address={destination_address}
                        isLoading={isConnecting}
                        setIsLoading={setIsConnecting}
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
                        onRemove={onRemoveAddress}
                    />
                }

                {
                    destination && !manualAddress && (unAvailableWallets.length > 0 || incompatibleAddressBook.length > 0) &&
                    <NotCompatibleWallets
                        notCompatibleWallets={unAvailableWallets}
                        notCompatibleAddresses={incompatibleAddressBook}
                        destination={destination}
                        partner={partner}
                        isLoading={isConnecting}
                    />
                }
            </div>
        </div>
    )

    if (inline) {
        return pickerBody;
    }

    return (
        <>
            <AddressButton
                addressItem={destinationAddressItem}
                openAddressModal={() => setShowAddressModal(true)}
                connectedWallet={connectedWallet}
                partner={partner}
                destination={destination}
            >{children ? children({ destination, addressItem: destinationAddressItem, connectedWallet: connectedWallet, partner }) : <></>}</AddressButton>
            <VaulDrawer
                mode="fitHeight"
                header='Send To'
                show={showAddressModal}
                setShow={setShowAddressModal}
                modalId="address"
            >
                <VaulDrawer.Snap id="item-1">
                    {pickerBody}
                </VaulDrawer.Snap >
            </VaulDrawer >
        </>
    )
});

const resolveAddressGroups = ({
    destination,
    wallets,
    savedAddresses,
    manualAddresses,
    addressFromQuery,
    providerName,
}: {
    destination: NetworkRoute | undefined,
    wallets: Wallet[] | undefined,
    savedAddresses: SavedAddress[],
    manualAddresses: ManualDestAddress[],
    addressFromQuery: string | undefined,
    providerName: string | undefined,
}) => {

    if (!destination) return

    const addresses: AddressItem[] = []
    wallets?.forEach(wallet => {
        if (wallet?.addresses?.length) {
            addresses.push(...(wallet.addresses.map(a => ({ address: a, group: AddressGroup.ConnectedWallet, wallet })) || []))
        }
    })
    if (addressFromQuery && AddressClass.isValid(addressFromQuery, destination)) {
        addresses.push({ address: addressFromQuery, group: AddressGroup.FromQuery })
    }

    manualAddresses.forEach(entry => {
        if (entry.providerName !== providerName || !AddressClass.isValid(entry.address, destination)) return
        const bookEntry = savedAddresses.find(e => AddressClass.equals(e.address, entry.address, destination, providerName))
        if (bookEntry && !savedAddressMatchesNetwork(bookEntry, destination)) return
        addresses.push({
            address: entry.address,
            group: AddressGroup.ManualAdded,
            providerName: entry.providerName,
        })
    })
    savedAddresses.forEach(entry => {
        if (savedAddressMatchesNetwork(entry, destination) && AddressClass.isValid(entry.address, destination)) {
            addresses.push({
                address: entry.address,
                group: AddressGroup.ManualAdded,
                providerName,
            })
        }
    })

    const uniqueAddresses = getUniqueAddresses(addresses, destination)

    return uniqueAddresses
}


const getUniqueAddresses = (addresses: AddressItem[], destination: NetworkRoute) => {
    const normalizedMap = new Map<string, AddressItem>();

    addresses.forEach((a) => {
        const normalized = new AddressClass(a.address, destination).normalized;
        if (!normalizedMap.has(normalized)) {
            normalizedMap.set(normalized, a);
        }
    });

    return Array.from(normalizedMap.values());
}

export default AddressPicker