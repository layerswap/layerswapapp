import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Check, History, Plus } from "lucide-react";
import KnownInternalNames from "../../../lib/knownIds";
import { isValidAddress } from "../../../lib/address/validator";
import { Partner } from "../../../Models/Partner";
import shortenAddress from "../../utils/ShortenAddress";
import useWallet from "../../../hooks/useWallet";
import { AddressItem, AddressGroup, useAddressBookStore } from "../../../stores/addressBookStore";
import { groupBy } from "../../utils/groupBy";
import { CommandGroup, CommandItem, CommandList, CommandWrapper } from "../../shadcn/command";
import AddressIcon from "../../AddressIcon";
import { addressFormat } from "../../../lib/address/formatter";
import { ResolveConnectorIcon } from "../../icons/ConnectorIcons";
import ManualAddressInput from "./ManualAddressInput";
import Modal from "../../modal/modal";
import ResizablePanel from "../../ResizablePanel";
import IconButton from "../../buttons/iconButton";
import RecentlyUsedAddresses from "./RecentlyUsedAddresses";

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
    const { destination_address, to: destination, toExchange: destinationExchange } = values
    const [openRecentAddresses, setOpenRecentAddresses] = useState<boolean>(false)
    const [selectedRecentlyAddress, setSelectedRecentlyAddress] = useState<string | undefined>()
    const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.name === e) : a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []

    const addresses = useAddressBookStore((state) => state.addresses).filter(a => a.networkType === values.to?.type && !(values.toExchange && a.group === AddressGroup.ConnectedWallet))
    const addAddresses = useAddressBookStore((state) => state.addAddresses)

    const [manualAddress, setManualAddress] = useState<string>('')
    const [newAddress, setNewAddress] = useState<string | undefined>()

    const { connectWallet, getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const connectedWallet = provider?.getConnectedWallet()
    const connectedWalletAddress = connectedWallet?.address

    useEffect(() => {

        let addresses: AddressItem[] = []

        if (selectedRecentlyAddress && destination) addresses = [...addresses.filter(a => addressFormat(selectedRecentlyAddress, destination) !== addressFormat(a.address, destination) && a.group !== AddressGroup.RecentlyUsed), { address: selectedRecentlyAddress, group: AddressGroup.RecentlyUsed, date: recentlyUsedAddresses.find(a => addressFormat(selectedRecentlyAddress, destination) === addressFormat(a.address, destination))?.date, networkType: destination.type }]
        if (connectedWalletAddress && destination) addresses = [...addresses.filter(a => addressFormat(connectedWalletAddress, destination) !== addressFormat(a.address, destination)), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: destination.type }]
        if (newAddress && destination) addresses = [...addresses.filter(a => addressFormat(newAddress, destination) !== addressFormat(a.address, destination)), { address: newAddress, group: AddressGroup.ManualAdded, networkType: destination.type }]

        addAddresses(addresses.filter(a => a.networkType === values.to?.type))

    }, [address_book, destination_address, connectedWalletAddress, newAddress, values.to, selectedRecentlyAddress])

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    const handleSelectAddress = useCallback((value: string) => {
        const address = destination && addresses.find(a => addressFormat(a.address, destination) === addressFormat(value, destination))?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue, setOpenRecentAddresses])

    const handleSelectRecentlyAddress = useCallback((value: string) => {
        setSelectedRecentlyAddress(value)
        setFieldValue("destination_address", value)
        setOpenRecentAddresses(false)
        close()
    }, [close, setFieldValue])

    const groupedAddresses = groupBy(addresses, ({ group }) => group)
    const groupedAddressesArray = Object.keys(groupedAddresses).map(g => { const items: AddressItem[] = groupedAddresses[g]; return ({ name: g, items: items, order: (g === AddressGroup.ManualAdded && 3 || g === AddressGroup.RecentlyUsed && 2 || g === AddressGroup.ConnectedWallet && 1) || 10 }) })

    const switchAccount = async () => {
        if (!provider) return
        await provider.reconnectWallet()
    }

    return (<>
        <Modal
            header={
                <div className="w-full flex items-center justify-between pr-4">
                    <div>
                        <span>To</span> <span>{(values.toExchange?.display_name ?? values?.to?.display_name) || ''}</span> <span>address</span>
                    </div>
                    {
                        recentlyUsedAddresses.length > 0 && <IconButton onClick={() => setOpenRecentAddresses(true)} icon={
                            <History />
                        } />
                    }
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
                                !disabled && addresses?.length > 0 &&
                                <div className="text-left">
                                    <CommandWrapper>
                                        <CommandList>
                                            {groupedAddressesArray.sort((a, b) => a.order - b.order).map((group) => {
                                                return (
                                                    <CommandGroup
                                                        key={group.name}
                                                        heading={
                                                            group.name === AddressGroup.ConnectedWallet ?
                                                                <div className="flex items-center justify-between w-full px-3 pb-1">
                                                                    {
                                                                        connectedWallet &&
                                                                        <div className="flex items-center gap-1.5">
                                                                            <connectedWallet.icon className="rounded flex-shrink-0 h-5 w-5" />
                                                                            <p>
                                                                                Connected wallet
                                                                            </p>
                                                                        </div>
                                                                    }
                                                                    <div>
                                                                        <button
                                                                            onClick={switchAccount}
                                                                            className="text-primary-text-muted text-xs"
                                                                        >
                                                                            Switch Wallet
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                :
                                                                group.name
                                                        }
                                                        className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-0 !py-0 !px-0 mt-2"
                                                    >
                                                        <div className="bg-secondary-800 overflow-hidden rounded-lg divide-y divide-secondary-600">
                                                            {group.items.map(item => {
                                                                const difference_in_days = item.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(item.date).getTime()) / (1000 * 3600 * 24))) : undefined

                                                                return (
                                                                    <CommandItem value={item.address} key={item.address} onSelect={handleSelectAddress} className={`!bg-transparent !px-3 hover:!bg-secondary-700 transition duration-200 ${addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-700'}`}>
                                                                        <div className={`flex items-center justify-between w-full`}>
                                                                            <div className={`space-x-2 flex text-sm items-center`}>
                                                                                <div className='flex bg-secondary-400 text-primary-text flex-row items-left rounded-md p-2'>
                                                                                    <AddressIcon address={item.address} size={20} />
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <div className="block text-sm font-medium">
                                                                                        {shortenAddress(item.address)}
                                                                                    </div>
                                                                                    <div className="text-gray-500">
                                                                                        {
                                                                                            item.group === 'Recently used' &&
                                                                                            (difference_in_days === 0 ?
                                                                                                <>Used today</>
                                                                                                :
                                                                                                (difference_in_days && difference_in_days > 1 ?
                                                                                                    <>Used {difference_in_days} days ago</>
                                                                                                    : <>Used yesterday</>))
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex h-6 items-center px-1">
                                                                                {
                                                                                    addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) &&
                                                                                    <Check />
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </div>
                                                    </CommandGroup>
                                                )
                                            })}
                                        </CommandList>
                                    </CommandWrapper>
                                </div>
                            }

                            {
                                !disabled
                                && destination
                                && provider
                                && !connectedWallet
                                && !values.toExchange &&
                                <ConnectWalletButton providerName={provider.name} onClick={() => { connectWallet(provider.name) }} />
                            }

                            <hr className="border-secondary-500 w-full" />

                            <ManualAddressInput
                                manualAddress={manualAddress}
                                setManualAddress={setManualAddress}
                                setNewAddress={setNewAddress}
                                addresses={addresses}
                                values={values}
                                partner={partner}
                                isPartnerWallet={isPartnerWallet}
                                partnerImage={partnerImage}
                                name={name}
                                inputReference={inputReference}
                                setFieldValue={setFieldValue}
                                close={close}
                            />

                        </div>
                    </div>
                </div >
            </ResizablePanel>
        </Modal>

        <Modal header="Recently used" height="fit" show={openRecentAddresses} setShow={setOpenRecentAddresses} modalId="recentlyUsedAddresses">
            <RecentlyUsedAddresses address_book={recentlyUsedAddresses} destination={destination} destination_address={destination_address} onSelect={handleSelectRecentlyAddress} />
        </Modal>
    </>
    )
});

const ConnectWalletButton = ({ providerName, onClick }: { providerName: string, onClick: () => void }) => {

    return <button onClick={onClick} type="button" className="py-5 px-6 bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl">
        <div className="flex flex-row justify-between gap-9 items-stretch">
            <ResolveConnectorIcon
                connector={providerName}
                iconClassName="w-10 h-10 p-0.5 rounded-lg bg-secondary-800 border border-secondary-400"
                className="grid grid-cols-2 gap-1 min-w-fit"
            >
                <div className="w-10 h-10 bg-secondary-400 rounded-lg flex-col justify-center items-center inline-flex">
                    <Plus className="h-6 w-6 text-secondary-text" />
                </div>
            </ResolveConnectorIcon>
            <div className="h-full space-y-2">
                <p className="text-sm font-medium text-secondary-text text-start">Connect your wallet to browse and select from your addresses</p>
                <div className="bg-primary-700/30 border-none !text-primary py-2 rounded-lg text-base font-semibold">
                    Connect Now
                </div>
            </div>
        </div>
    </button>
}

export default AddressPicker