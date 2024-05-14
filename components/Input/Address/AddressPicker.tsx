import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Check, Info, Plus } from "lucide-react";
import KnownInternalNames from "../../../lib/knownIds";
import { isValidAddress } from "../../../lib/address/validator";
import { Partner } from "../../../Models/Partner";
import shortenAddress from "../../utils/ShortenAddress";
import useWallet, { WalletProvider } from "../../../hooks/useWallet";
import { AddressItem, AddressGroup, useAddressBookStore } from "../../../stores/addressBookStore";
import { CommandGroup, CommandList, CommandWrapper } from "../../shadcn/command";
import AddressIcon from "../../AddressIcon";
import { addressFormat } from "../../../lib/address/formatter";
import { ResolveConnectorIcon } from "../../icons/ConnectorIcons";
import ManualAddressInput from "./ManualAddressInput";
import Modal from "../../modal/modal";
import ResizablePanel from "../../ResizablePanel";
import { Wallet } from "../../../stores/walletStore";
import { RouteNetwork, Token } from "../../../Models/Network";
import Image from "next/image";
import { Exchange } from "../../../Models/Exchange";

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
        const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.name === e) : a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []

        if (!destination) return

        let addresses: AddressItem[] = []

        if (recentlyUsedAddresses && values.to) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => ra.address === a.address)), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: values.to?.type }))]
        if (connectedWalletAddress && destination) addresses = [...addresses.filter(a => addressFormat(connectedWalletAddress, destination) !== addressFormat(a.address, destination)), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: destination.type }]
        if (newAddress && destination) addresses = [...addresses.filter(a => a.group !== AddressGroup.ManualAdded && addressFormat(newAddress, destination) !== addressFormat(a.address, destination)), { address: newAddress, group: AddressGroup.ManualAdded, networkType: destination.type }]

        addAddresses(addresses.filter(a => a.networkType === values.to?.type))

    }, [address_book, destination_address, connectedWalletAddress, newAddress, values.to])

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    const handleSelectAddress = useCallback((value: string) => {
        const address = destination && addresses.find(a => addressFormat(a.address, destination) === addressFormat(value, destination))?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue])

    const filteredAddresses = addresses.filter(a => a.group !== AddressGroup.ConnectedWallet)

    return (<>
        <Modal
            header={
                <div className="w-full">
                    <span>To</span> <span>{(values.toExchange?.display_name ?? values?.to?.display_name) || ''}</span> <span>address</span>
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

                            {
                                !disabled && filteredAddresses?.length > 0 && !manualAddress &&
                                <div className="text-left">
                                    <CommandWrapper>
                                        <CommandList>
                                            <CommandGroup
                                                heading="Address Book"
                                                className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-0 !py-0 !px-0 mt-2"
                                            >
                                                <div className="space-y-0 w-full flex flex-col items-stretch">
                                                    {filteredAddresses.sort((a, b) =>
                                                        (a.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24))) : 0)
                                                        - (b.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(b.date).getTime()) / (1000 * 3600 * 24))) : 0)
                                                    ).map(item => {
                                                        const difference_in_days = item.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(item.date).getTime()) / (1000 * 3600 * 24))) : undefined

                                                        return (
                                                            <button type="button" key={item.address} onClick={() => handleSelectAddress(item.address)} className={`px-3 py-3  !rounded-md hover:!bg-secondary-700 w-full transition duration-200 ${addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                                                                <div className={`flex items-center justify-between w-full`}>
                                                                    <div className={`space-x-2 flex text-sm items-center`}>
                                                                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                                                                            <AddressIcon className="scale-150 h-9 w-9" address={item.address} size={36} />
                                                                        </div>
                                                                        <div className="flex flex-col items-start">
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
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </CommandGroup>
                                        </CommandList>
                                    </CommandWrapper>
                                </div>
                            }
                        </div>
                    </div>
                </div >
            </ResizablePanel>
        </Modal>
    </>
    )
});

const ConnectWalletButton = ({ provider, onClick, connectedWallet, destination, destination_address }: { provider: WalletProvider, onClick: () => void, connectedWallet: Wallet | undefined, destination: RouteNetwork, destination_address: string | undefined }) => {

    return connectedWallet ?
        <div className="px-3 pb-2 pt-2.5 rounded-lg bg-secondary-700 flex flex-col gap-2">
            <div className="flex items-center justify-between w-full px-2 ">
                {
                    connectedWallet &&
                    <div className="flex items-center gap-1.5 text-secondary-text text-sm">
                        <connectedWallet.icon className="rounded flex-shrink-0 h-5 w-5" />
                        <p>
                            {connectedWallet.connector}
                        </p>
                    </div>
                }
                <button
                    onClick={async () => await provider.reconnectWallet(destination.chain_id)}
                    className="text-primary-text-muted text-xs"
                >
                    Switch Wallet
                </button>
            </div>
            <button type="button" onClick={onClick} className={`w-full px-3 py-2 -mx-1 rounded-md hover:!bg-secondary-800 transition duration-200 ${addressFormat(connectedWallet.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                <div className={`flex items-center justify-between w-full`}>
                    <div className={`space-x-2 flex text-sm items-center`}>
                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                            <AddressIcon className="scale-150 h-9 w-9" address={connectedWallet.address} size={36} />
                        </div>
                        <div className="flex flex-col">
                            <div className="block text-sm font-medium">
                                {shortenAddress(connectedWallet.address)}
                            </div>
                        </div>
                    </div>
                    <div className="flex h-6 items-center px-1">
                        {
                            addressFormat(connectedWallet.address, destination!) === addressFormat(destination_address!, destination!) &&
                            <Check />
                        }
                    </div>
                </div>
            </button>
        </div>
        :
        <button typeof="button" onClick={onClick} type="button" className="py-5 px-6 bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl">
            <div className="flex flex-row justify-between gap-9 items-stretch">
                <ResolveConnectorIcon
                    connector={provider.name}
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

const ExchangeNote = ({ destinationAsset, destinationExchange, destination }: { destinationAsset: Token | undefined, destinationExchange: Exchange, destination: RouteNetwork | undefined }) => {

    if (!destinationAsset || !destinationExchange || !destination) return

    return (
        <div className='text-left p-4 bg-secondary-800 text-primary-text rounded-lg border border-secondary-500 basis-full mt-3 w-full'>
            <div className="flex items-center">
                <Info className='h-5 w-5 text-primary-600 mr-3' />
                <label className="block text-sm md:text-base font-medium leading-6">How to find your {destinationExchange.display_name} deposit address</label>
            </div>
            <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8 text-primary-text">
                <li>Go to the Deposits page</li>
                <li>
                    <span>Select</span>
                    <span className="inline-block mx-1">
                        <span className='flex gap-1 items-baseline text-sm '>
                            <Image src={destinationAsset.logo}
                                alt="Project Logo"
                                height="15"
                                width="15"
                                className='rounded-sm'
                            />
                            <span className="text-primary-text">{destinationAsset.symbol}</span>
                        </span>
                    </span>
                    <span>as asset</span>
                </li>
                <li>
                    <span>Select</span>
                    <span className="inline-block mx-1">
                        <span className='flex gap-1 items-baseline text-sm '>
                            <Image src={destination?.logo || ''}
                                alt="Project Logo"
                                height="15"
                                width="15"
                                className='rounded-sm'
                            />
                            <span className="text-primary-text">{destination?.display_name}</span>
                        </span>
                    </span>
                    <span>as network</span>
                </li>
            </ul>
        </div>
    )
}

export default AddressPicker