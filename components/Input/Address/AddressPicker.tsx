import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Check, Plus } from "lucide-react";
import KnownInternalNames from "../../../lib/knownIds";
import { isValidAddress } from "../../../lib/address/validator";
import { Partner } from "../../../Models/Partner";
import shortenAddress from "../../utils/ShortenAddress";
import WalletIcon from "../../icons/WalletIcon";
import useWallet from "../../../hooks/useWallet";
import { AddressItem, AddressGroup, useAddressBookStore } from "../../../stores/addressBookStore";
import { groupBy } from "../../utils/groupBy";
import { CommandGroup, CommandItem, CommandList, CommandWrapper } from "../../shadcn/command";
import AddressIcon from "../../AddressIcon";
import { addressFormat } from "../../../lib/address/formatter";
import { ResolveConnectorIcon } from "../../icons/ConnectorIcons";
import ManualAddressInput from "./ManualAddressInput";

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
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
    ({ name, canFocus, close, address_book, disabled, isPartnerWallet, partnerImage, partner, wrongNetwork }, ref) {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const inputReference = useRef<HTMLInputElement>(null);
    const { destination_address, to: destination, toExchange: destinationExchange } = values

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

        let addresses: AddressItem[] = []

        // if (recentlyUsedAddresses && destination) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => addressFormat(ra.address, destination) === addressFormat(a.address, destination))), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: destination.type }))]
        if (connectedWalletAddress && destination) addresses = [...addresses.filter(a => addressFormat(connectedWalletAddress, destination) !== addressFormat(a.address, destination)), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: destination.type }]
        if (newAddress && destination) addresses = [...addresses.filter(a => addressFormat(newAddress, destination) !== addressFormat(a.address, destination)), { address: newAddress, group: AddressGroup.ManualAdded, networkType: destination.type }]

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


    const groupedAddresses = groupBy(addresses, ({ group }) => group)
    const groupedAddressesArray = Object.keys(groupedAddresses).map(g => { const items: AddressItem[] = groupedAddresses[g]; return ({ name: g, items: items, order: (g === AddressGroup.ManualAdded && 3 || g === AddressGroup.RecentlyUsed && 2 || g === AddressGroup.ConnectedWallet && 1) || 10 }) })

    //fix this
    const switchAccount = async () => {
        if (!provider) return
        await provider.reconnectWallet()
    }

    return (<>
        <div className='w-full flex flex-col justify-between h-full text-primary-text pt-2 min-h-[277px]'>
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
                        <ConnectWalletButton providerName={provider.name} onClick={() => { connectWallet(provider.name) }} expanded={addresses.length === 0 && !manualAddress} />
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
        </div>
    </>
    )
});

const ConnectWalletButton = ({ providerName, expanded, onClick }: { providerName: string, expanded: boolean, onClick: () => void }) => {
    return (
        <button onClick={onClick} type="button" className="py-5 px-4 bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl">
            <div className={expanded ? 'flex items-center gap-8' : ''}>
                <div className={expanded ? "space-y-3" : 'flex justify-between items-center w-full'}>
                    <div className="flex items-center gap-1.5">
                        <WalletIcon className='stroke-2 w-6 h-6' />
                        <h2 className={expanded ? "text-2xl font-medium" : "text-xl font-medium"}>
                            Connect to wallet
                        </h2>
                    </div>

                    <div className={expanded ? "flex flex-col gap-1 items-start" : "h-full flex items-start justify-center"}>
                        <div className="justify-start items-end gap-1.5 inline-flex">
                            <ResolveConnectorIcon
                                connector={providerName}
                                iconClassName="w-7 h-7 p-0.5 rounded-md bg-secondary-800 border border-secondary-400"
                                className="space-x-0.5 inline-flex"
                            />
                            <div className="-space-x-2 w-7 h-7 bg-slate-900 rounded-md flex-col justify-center items-center inline-flex">
                                <Plus className="h-4 w-4 text-secondary-text" />
                            </div>
                        </div>
                        <p className={expanded ? "text-xs text-secondary-text" : 'hidden'}>Short description about connecting wallets</p>
                    </div>
                </div>
                <WalletIcon className={expanded ? 'h-20 w-auto' : 'hidden'} />
            </div>
        </button>
    )
}


export default AddressPicker