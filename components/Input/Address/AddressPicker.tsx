import { useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Check, FilePlus2, History, Info, X } from "lucide-react";
import KnownInternalNames from "../../../lib/knownIds";
import { useSettingsState } from "../../../context/settings";
import { isValidAddress } from "../../../lib/address/validator";
import Image from 'next/image';
import { Partner } from "../../../Models/Partner";
import shortenAddress from "../../utils/ShortenAddress";
import WalletIcon from "../../icons/WalletIcon";
import useWallet from "../../../hooks/useWallet";
import { AddressItem, AddressGroup, useAddressBookStore } from "../../../stores/addressBookStore";
import { groupBy } from "../../utils/groupBy";
import { CommandGroup, CommandItem, CommandList, CommandWrapper } from "../../shadcn/command";
import SubmitButton from "../../buttons/submitButton";
import AddressIcon from "../../AddressIcon";
import { addressFormat } from "../../../lib/address/formatter";

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
        const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.name === e) : a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []

        let addresses: AddressItem[] = []

        if (recentlyUsedAddresses && destination) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => addressFormat(ra.address, destination) === addressFormat(a.address, destination))), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: destination.type }))]
        if (connectedWalletAddress && destination) addresses = [...addresses.filter(a => addressFormat(connectedWalletAddress, destination) !== addressFormat(a.address, destination)), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: destination.type }]
        if (newAddress && destination) addresses = [...addresses.filter(a => addressFormat(newAddress, destination) !== addressFormat(a.address, destination)), { address: newAddress, group: AddressGroup.ManualAdded, networkType: destination.type }]

        addAddresses(addresses.filter(a => a.networkType === values.to?.type))

    }, [address_book, destination_address, connectedWalletAddress, newAddress, values.to])

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    useEffect(() => {
        if (values.destination_address && destination && addresses.find(a => addressFormat(a.address, destination) === addressFormat(values.destination_address!, destination))?.group === AddressGroup.ManualAdded) {
            setManualAddress(values.destination_address)
        }
    }, [])

    const handleRemoveNewDepositeAddress = useCallback(async () => {
        setManualAddress('')
    }, [setManualAddress])

    const handleSelectAddress = useCallback((value: string) => {
        const address = destination && addresses.find(a => addressFormat(a.address, destination) === addressFormat(value, destination))?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue])

    let errorMessage = '';
    if (manualAddress && !isValidAddress(manualAddress, destination)) {
        errorMessage = `Enter a valid ${values.to?.display_name} address`
    }

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setManualAddress(e.target.value)
    }, [])

    const handleSaveNewAddress = () => {
        if (isValidAddress(manualAddress, values.to)) {
            if (destination && !addresses.some(a => addressFormat(a.address, destination) === addressFormat(manualAddress, destination))) {
                setNewAddress(manualAddress)
            }
            setFieldValue(name, manualAddress)
            setManualAddress("")
        }
        close()
    }

    const destinationAsset = values.toCurrency
    const groupedAddresses = groupBy(addresses, ({ group }) => group)
    const groupedAddressesArray = Object.keys(groupedAddresses).map(g => { const items: AddressItem[] = groupedAddresses[g]; return ({ name: g, items: items, order: (g === AddressGroup.ManualAdded && 3 || g === AddressGroup.RecentlyUsed && 2 || g === AddressGroup.ConnectedWallet && 1) || 10 }) })

    return (<>
        <div className='w-full flex flex-col justify-between h-full text-primary-text pt-2'>
            <div className='flex flex-col self-center grow w-full'>
                <div className='flex flex-col self-center grow w-full space-y-3'>
                    {
                        !disabled
                        && destination
                        && provider
                        && !connectedWallet
                        && !values.toExchange &&
                        <SubmitButton onClick={() => { connectWallet(provider.name) }} text_align="left" icon={<WalletIcon className='stroke-2 w-6 h-6' strokeWidth={2} />} className="bg-primary/20 border-none !text-primary !px-5 gap-1" type="button" isDisabled={false} isSubmitting={false}>
                            Connect a wallet
                        </SubmitButton>
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
                        !disabled && addresses?.length > 0 &&
                        <div className="text-left">
                            <CommandWrapper>
                                <CommandList>
                                    {groupedAddressesArray.filter(a => a.name !== AddressGroup.ManualAdded).sort((a, b) => a.order - b.order).map((group) => {
                                        return (
                                            <CommandGroup key={group.name} heading={group.name} className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-3 [&_[cmdk-group-heading]]:!pt-2 !py-0 !px-0">
                                                <div className="bg-secondary-800 overflow-hidden rounded-lg divide-y divide-secondary-600">
                                                    {group.items.map(item => {
                                                        const difference_in_days = item.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(item.date).getTime()) / (1000 * 3600 * 24))) : undefined

                                                        return (
                                                            <CommandItem value={item.address} key={item.address} onSelect={handleSelectAddress} className="!bg-transparent !px-3 hover:!bg-secondary-700 transition duration-200">
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
                    <div className="w-full flex items-center gap-2">
                        {
                            !destinationExchange &&
                            <p className="text-primary-text-muted mb-1">
                                or
                            </p>
                        }
                        <hr className="border-secondary-500 w-full" />
                    </div>
                    <div className="text-left">
                        {isPartnerWallet && partner && <span className='truncate text-sm text-secondary-text'> ({partner?.display_name})</span>}
                        <div className="flex flex-wrap flex-col md:flex-row items-center">
                            <div className="relative flex grow rounded-lg shadow-sm bg-secondary-700 border-secondary-500 border focus-within:ring-0 focus-within:ring-primary focus-within:border-primary w-full sm:w-fit">
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
                                errorMessage &&
                                <div className="basis-full text-xs text-primary">
                                    {errorMessage}
                                </div>
                            }
                            {
                                destinationAsset && values.toExchange &&
                                <div className='text-left p-4 bg-secondary-800 text-primary-text rounded-lg border border-secondary-500 basis-full mt-3 w-full'>
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
                                                    <Image src={values.to?.logo || ''}
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
                            {
                                manualAddress && !errorMessage &&
                                <div onClick={handleSaveNewAddress} className={`text-left min-h-12 cursor-pointer space-x-2 bg-secondary-800 shadow-xl flex text-sm rounded-md items-center w-full transform hover:bg-secondary-700 transition duration-200 p-3 hover:shadow-xl mt-3`}>
                                    <div className='flex text-primary-text bg-secondary-400 flex-row items-left rounded-md p-2'>
                                        <AddressIcon size={20} address={manualAddress} />
                                    </div>
                                    <div className="flex flex-col grow">
                                        <div className="block text-md font-medium text-primary-text">
                                            {shortenAddress(manualAddress)}
                                        </div>
                                    </div>
                                    <div className='flex text-primary-text flex-row items-left h-6 rounded-md px-1'>
                                        {
                                            addressFormat(manualAddress, destination!) === addressFormat(destination_address!, destination!) &&
                                            <Check />
                                        }
                                    </div>
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