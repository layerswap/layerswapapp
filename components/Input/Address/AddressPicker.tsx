import { useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Check, FilePlus2, History, Info, X } from "lucide-react";
import KnownInternalNames from "../../../lib/knownIds";
import { useSettingsState } from "../../../context/settings";
import { isValidAddress } from "../../../lib/addressValidator";
import Image from 'next/image';
import { Partner } from "../../../Models/Partner";
import shortenAddress from "../../utils/ShortenAddress";
import WalletIcon from "../../icons/WalletIcon";
import useWallet from "../../../hooks/useWallet";
import { Address, AddressGroup, useAddressBookStore } from "../../../stores/addressBookStore";
import { groupBy } from "../../utils/groupBy";
import { CommandGroup, CommandItem, CommandList, CommandWrapper } from "../../shadcn/command";

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

    const placeholder = "Enter your address here"
    const [manualAddress, setManualAddress] = useState<string>('')
    const [newAddress, setNewAddress] = useState<string | undefined>()

    const { connectWallet, getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const connectedWallet = provider?.getConnectedWallet()
    const connectedWalletAddress = connectedWallet?.address
    const settings = useSettingsState()

    useEffect(() => {
        const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.internal_name === e) : a.networks?.some(n => destination?.internal_name === n) && isValidAddress(a.address, destination)) || []

        let addresses: Address[] = []

        if (recentlyUsedAddresses && values.to) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => ra.address === a.address)), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: values.to?.type, icon: History }))]
        if (connectedWalletAddress && values.to) addresses = [...addresses.filter(a => connectedWalletAddress !== a.address), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: values.to.type, icon: connectedWallet ? connectedWallet.icon : WalletIcon }]
        if (newAddress && values.to) addresses = [...addresses.filter(a => newAddress !== a.address), { address: newAddress, group: AddressGroup.ManualAdded, networkType: values.to.type, icon: FilePlus2 }]

        addAddresses(addresses.filter(a => a.networkType === values.to?.type))

    }, [address_book, destination_address, connectedWalletAddress, newAddress, values.to])

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    const handleRemoveNewDepositeAddress = useCallback(async () => {
        setManualAddress('')
    }, [setManualAddress])

    const handleSelectAddress = useCallback((value: string) => {
        const address = addresses.find(a => a.address.toLowerCase() === value)?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue])

    let errorMessage = '';
    if (manualAddress && !isValidAddress(manualAddress, destination)) {
        errorMessage = `Enter a valid ${values.to?.display_name} address`
    } else if (addresses.some(a => a.address.toLowerCase() === manualAddress.toLowerCase())) {
        errorMessage = "Entered address already exist in this list"
    }

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setManualAddress(e.target.value)
    }, [])

    const handleSaveNewAddress = () => {
        if (isValidAddress(manualAddress, values.to)) {
            if (!addresses.some(a => a.address.toLowerCase() === manualAddress.toLowerCase())) {
                setNewAddress(manualAddress)
            }
            setFieldValue(name, manualAddress)
            setManualAddress("")
        }
    }

    const destinationAsset = values.toCurrency
    const groupedAddresses = groupBy(addresses, ({ group }) => group)
    const groupedAddressesArray = Object.keys(groupedAddresses).map(g => ({ name: g, items: groupedAddresses[g] }))

    return (<>
        <div className='w-full flex flex-col justify-between h-full text-primary-text pt-2'>
            <div className='flex flex-col self-center grow w-full'>
                <div className='flex flex-col self-center grow w-full space-y-3'>
                    {
                        !disabled && addresses?.length > 0 &&
                        <div className="text-left">
                            <CommandWrapper>
                                <CommandList>
                                    {groupedAddressesArray.map((group) => {
                                        return (
                                            <CommandGroup key={group.name} heading={group.name} className="[&_[cmdk-group-heading]]:!px-0 [&_[cmdk-group-heading]]:!p-0 [&_[cmdk-group-heading]]:!pb-0 [&_[cmdk-group-heading]]:!pt-2 !py-0 !px-0">
                                                {group.items.map(item => {
                                                    const difference_in_days = item.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(item.date).getTime()) / (1000 * 3600 * 24))) : undefined

                                                    return (
                                                        <CommandItem value={item.address} key={item.address} onSelect={handleSelectAddress} className="!px-0 !pt-1.5 !bg-transparent !pb-1">
                                                            <div className={`flex items-center justify-between w-full transform transition duration-200 rounded-md hover:opacity-70`}>
                                                                <div className={`space-x-2 flex text-sm items-center`}>
                                                                    <div className='flex bg-secondary-400 text-primary-text flex-row items-left rounded-md p-2'>
                                                                        <item.icon className="h-5 w-5" strokeWidth={2} />
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
                                                                {
                                                                    destination_address === item.address &&
                                                                    <Check className="h-5 w-5" />
                                                                }
                                                            </div>
                                                        </CommandItem>
                                                    )
                                                }

                                                )
                                                }
                                            </CommandGroup>)
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
                        <div onClick={() => { connectWallet(provider.name) }} className={`min-h-12 text-left cursor-pointer space-x-2 border border-secondary-500 bg-secondary-700/70 flex text-sm rounded-md items-center w-full transform transition duration-200 px-2 py-1.5 hover:border-secondary-500 hover:bg-secondary-700 hover:shadow-xl`}>
                            <div className='flex text-primary-text flex-row items-left bg-secondary-400 px-2 py-1 rounded-md'>
                                <WalletIcon className="w-5 h-5 text-primary-text" />
                            </div>
                            <div className="flex flex-col">
                                <div className="block text-sm font-medium">
                                    Autofill from wallet
                                </div>
                                <div className="text-gray-500">
                                    Connect your wallet to fetch the address
                                </div>
                            </div>
                        </div>
                    }
                    {
                        wrongNetwork && !destination_address &&
                        <div className="basis-full text-xs text-primary">
                            {
                                destination?.internal_name === KnownInternalNames.Networks.StarkNetMainnet
                                    ? <span>Please switch to Starknet Mainnet with your wallet and click Autofill again</span>
                                    : <span>Please switch to Starknet Sepolia with your wallet and click Autofill again</span>
                            }
                        </div>
                    }
                    {
                        addresses && addresses.length > 0 &&
                        <hr className="border-secondary-500" />
                    }
                    <div className="text-left">
                        <label className="text-secondary-text" htmlFor={name}>New address</label>
                        {isPartnerWallet && partner && <span className='truncate text-sm text-indigo-200'> ({partner?.display_name})</span>}
                        <div className="flex flex-wrap flex-col md:flex-row items-center mt-1.5">
                            <div className="relative flex grow rounded-lg shadow-sm  bg-secondary-700 border-secondary-500 border focus-within:ring-0 focus-within:ring-primary focus-within:border-primary">
                                {isPartnerWallet &&
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {
                                            partnerImage &&
                                            <Image alt="Partner logo" className='rounded-md object-contain' src={partnerImage} width="24" height="24"></Image>
                                        }
                                    </div>
                                }
                                <input
                                    onChange={handleInputChange}
                                    value={manualAddress}
                                    placeholder={placeholder}
                                    autoCorrect="off"
                                    type={"text"}
                                    // disabled={disabled || !!(connectedWallet && values.destination_address)}
                                    name={name}
                                    id={name}
                                    ref={inputReference}
                                    tabIndex={0}
                                    className={`${isPartnerWallet ? 'pl-11' : ''} disabled:cursor-not-allowed grow h-12 border-none leading-4  block font-semibold w-full bg-secondary-700 rounded-lg truncate hover:overflow-x-scroll focus:ring-0 focus:outline-none`}
                                />
                                {
                                    manualAddress &&
                                    <span className="inline-flex items-center mr-2">
                                        <button
                                            type="button"
                                            className="p-0.5 duration-200 transition  hover:bg-secondary-400  rounded-md border border-secondary-500 hover:border-secondary-200"
                                            onClick={handleRemoveNewDepositeAddress}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </span>
                                }
                            </div>
                            {
                                manualAddress &&
                                <span className="inline-flex items-center">
                                    <div className="text-xs flex items-center space-x-2 md:ml-3 bg-secondary-500 rounded-md border border-secondary-500">
                                        <button
                                            type="button"
                                            className="p-0.5 duration-200 transition hover:bg-secondary-400 rounded-md border border-secondary-500 hover:border-secondary-200"
                                            onClick={handleSaveNewAddress}
                                        >
                                            <div className="flex items-center px-2 text-sm py-1 font-semibold">
                                                Save
                                            </div>
                                        </button>
                                    </div>
                                </span>
                            }
                            {
                                errorMessage &&
                                <div className="basis-full text-xs text-primary">
                                    {errorMessage}
                                </div>
                            }
                            {
                                destinationAsset
                                && values.toExchange
                                &&
                                <div className='text-left p-4 bg-secondary-800 text-primary-text rounded-lg border border-secondary-500 basis-full mt-3'>
                                    <div className="flex items-center">
                                        <Info className='h-5 w-5 text-primary-600 mr-3' />
                                        <label className="block text-sm md:text-base font-medium leading-6">How to find your {values.toExchange.display_name} deposit address</label>
                                    </div>
                                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8 text-primary-text">
                                        <li>Go to the Deposits page</li>
                                        <li>
                                            <span>Select</span>
                                            <span className="inline-block mx-1">
                                                <span className='flex gap-1 items-baseline text-sm '>
                                                    <Image src={settings.resolveImgSrc(destinationAsset)}
                                                        alt="Project Logo"
                                                        height="15"
                                                        width="15"
                                                        className='rounded-sm'
                                                    />
                                                    <span className="text-primary-text">{destinationAsset.asset}</span>
                                                </span>
                                            </span>
                                            <span>as asset</span>
                                        </li>
                                        <li>
                                            <span>Select</span>
                                            <span className="inline-block mx-1">
                                                <span className='flex gap-1 items-baseline text-sm '>
                                                    <Image src={settings.resolveImgSrc(values.to)}
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
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
    )
});

export default AddressPicker