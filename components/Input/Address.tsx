import { useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../lib/layerSwapApiClient";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import { useSwapDataUpdate } from "../../context/swap";
import { Check, FilePlus2, History, Info } from "lucide-react";
import KnownInternalNames from "../../lib/knownIds";
import { useSettingsState } from "../../context/settings";
import { isValidAddress } from "../../lib/addressValidator";
import { RadioGroup } from "@headlessui/react";
import Image from 'next/image';
import { Partner } from "../../Models/Partner";
import shortenAddress from "../utils/ShortenAddress";
import AddressIcon from "../AddressIcon";
import WalletIcon from "../icons/WalletIcon";
import useWallet from "../../hooks/useWallet";
import { useAddressBookStore } from "../../stores/addressBookStore";

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
    address_book?: AddressBookItem[]
}

const Address: FC<Input> = forwardRef<HTMLInputElement, Input>(function Address
    ({ name, canFocus, close, address_book, disabled, isPartnerWallet, partnerImage, partner }, ref) {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const [wrongNetwork, setWrongNetwork] = useState(false)
    const inputReference = useRef<HTMLInputElement>(null);
    const destination = values.to
    const destinationExchange = values.toExchange

    const addresses = useAddressBookStore((state) => state.addresses)
    const addAddress = useAddressBookStore((state) => state.addAddress)

    const { setDepositeAddressIsfromAccount } = useSwapDataUpdate()
    const placeholder = "Enter your address here"
    const [currentAddress, setCurrentAddress] = useState<string | undefined>(values?.destination_address || "")
    const [validInputAddress, setValidInputAddress] = useState<string | undefined>('')
    const [manualAddress, setManualAddress] = useState<string>('')
    const [newAddress, setNewAddress] = useState<string | undefined>()
    const destinationIsStarknet = destination?.internal_name === KnownInternalNames.Networks.StarkNetGoerli
        || destination?.internal_name === KnownInternalNames.Networks.StarkNetMainnet

    const { connectWallet, disconnectWallet, getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const connectedWallet = provider?.getConnectedWallet()
    const connectedWalletAddress = connectedWallet?.address
    const settings = useSettingsState()

    useEffect(() => {
        const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.internal_name === e) : a.networks?.some(n => destination?.internal_name === n) && isValidAddress(a.address, destination)) || []

        let addresses: { address: string, type: string, date?: string }[] = []

        // if (currentAddress) addresses = [...addresses.filter(a => currentAddress !== a.address), { address: currentAddress, type: 'current' }]
        if (recentlyUsedAddresses) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => ra.address === a.address)), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, type: 'recentlyUsed' }))]
        if (connectedWalletAddress) addresses = [...addresses.filter(a => connectedWalletAddress !== a.address), { address: connectedWalletAddress, type: 'wallet' }]
        if (newAddress) addresses = [...addresses.filter(a => newAddress !== a.address), { address: newAddress, type: 'manual' }]

        addresses.forEach(a => {
            addAddress(a)
        })
    }, [address_book, currentAddress, connectedWalletAddress, newAddress])

    useEffect(() => {
        if (destination && isValidAddress(connectedWallet?.address, destination) && !values?.destination_address && !values.toExchange) {
            //TODO move to wallet implementation
            if (connectedWallet
                && connectedWallet.providerName === 'starknet'
                && (connectedWallet.chainId != destinationChainId)
                && destination) {
                (async () => {
                    setWrongNetwork(true)
                    await disconnectWallet(connectedWallet.providerName)
                })()
                return
            }
            setCurrentAddress(connectedWallet?.address)
            setFieldValue("destination_address", connectedWallet?.address)
        }
    }, [connectedWallet?.address, destination])

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    useEffect(() => {
        values.destination_address && setCurrentAddress(values.destination_address)
    }, [values.destination_address])

    const handleRemoveNewDepositeAddress = useCallback(async () => {
        setManualAddress('')
    }, [setManualAddress])

    const handleSelectAddress = useCallback((value: string) => {
        setFieldValue("destination_address", value)
        close()
    }, [close, setFieldValue])

    const inputAddressIsValid = isValidAddress(currentAddress, destination)
    let errorMessage = '';
    if (manualAddress && !isValidAddress(manualAddress, destination)) {
        errorMessage = `Enter a valid ${values.to?.display_name} address`
    }

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setCurrentAddress(e.target.value)
    }, [])

    useEffect(() => {
        if (inputAddressIsValid) {
            setValidInputAddress(currentAddress)
        }
    }, [currentAddress, inputAddressIsValid])

    const handleSetNewAddress = useCallback(() => {
        setFieldValue("destination_address", validInputAddress)
        close()
    }, [validInputAddress])

    const destinationAsset = values.toCurrency
    const destinationChainId = values?.to?.chain_id

    return (<>
        <div className='w-full flex flex-col justify-between h-full text-primary-text pt-5'>
            <div className='flex flex-col self-center grow w-full'>
                <div className='flex flex-col self-center grow w-full space-y-3'>
                    {
                        !inputAddressIsValid
                        && destinationAsset
                        && values.toExchange
                        &&
                        <div className='text-left p-4 bg-secondary-800 text-primary-text rounded-lg border border-secondary-500'>
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
                    {
                        !disabled && addresses?.length > 0 &&
                        <div className="text-left">
                            <label className="text-secondary-text">Address book</label>
                            <RadioGroup disabled={disabled} value={values.destination_address} onChange={handleSelectAddress}>
                                <div className="rounded-md overflow-y-auto styled-scroll max-h-[300px]">
                                    {addresses?.map(a => (
                                        <RadioGroup.Option
                                            key={a.address}
                                            value={a.address}
                                            disabled={disabled}
                                            className={({ disabled }) =>
                                                classNames(
                                                    disabled ? ' cursor-not-allowed ' : ' cursor-pointer ',
                                                    'relative flex focus:outline-none mt-2 mb-3  '
                                                )
                                            }
                                        >
                                            {({ checked }) => {
                                                const difference_in_days = a.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24))) : undefined
                                                return (
                                                    <RadioGroup.Description as="span" className={`flex items-center justify-between w-full transform transition duration-200 px-2 py-1.5 rounded-md border border-secondary-500 hover:bg-secondary-700 hover:shadow-xl`}>
                                                        <div className={`space-x-2 flex text-sm items-center`}>
                                                            <div className='flex bg-secondary-400 text-primary-text flex-row items-left rounded-md p-2'>
                                                                {
                                                                    a.type === 'recentlyUsed' &&
                                                                    <History className="h-5 w-5" />
                                                                }
                                                                {
                                                                    a.type === 'wallet' &&
                                                                    <WalletIcon strokeWidth={2} className='h-5 w-5' />
                                                                }
                                                                {
                                                                    a.type === 'manual' &&
                                                                    <FilePlus2 className="h-5 w-5" />
                                                                }
                                                                {
                                                                    a.type === 'current' &&
                                                                    <AddressIcon address={a.address} size={20} />
                                                                }
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="block text-sm font-medium">
                                                                    {shortenAddress(a.address)}
                                                                </div>
                                                                <div className="text-gray-500">
                                                                    {
                                                                        a.type === 'recentlyUsed' &&
                                                                        (difference_in_days === 0 ?
                                                                            <>Used today</>
                                                                            :
                                                                            (difference_in_days && difference_in_days > 1 ?
                                                                                <>Used {difference_in_days} days ago</>
                                                                                : <>Used yesterday</>))
                                                                    }
                                                                    {
                                                                        a.type === 'wallet' &&
                                                                        <>Connected wallet</>
                                                                    }
                                                                    {
                                                                        a.type === 'manual' &&
                                                                        <>New added</>
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {
                                                            checked &&
                                                            <Check className="h-5 w-5" />
                                                        }
                                                    </RadioGroup.Description>
                                                )
                                            }}
                                        </RadioGroup.Option>
                                    ))}
                                    {
                                        !disabled
                                        && destination
                                        && provider
                                        && !connectedWallet
                                        && !values.toExchange &&
                                        <div onClick={() => { connectWallet(provider.name) }} className={`min-h-12 text-left cursor-pointer space-x-2 border border-secondary-500 bg-secondary-700/70  flex text-sm rounded-md items-center w-full transform transition duration-200 px-2 py-1.5 hover:border-secondary-500 hover:bg-secondary-700 hover:shadow-xl`}>
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
                                </div>
                            </RadioGroup>
                        </div>
                    }

                    {
                        addresses && addresses.length > 0 &&
                        <hr className="border-secondary-500" />
                    }
                    <div className="text-left">
                        <label className="text-secondary-text" htmlFor={'manualAddress'}>New address</label>
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
                                    onChange={(v) => setManualAddress(v.target.value)}
                                    value={manualAddress}
                                    placeholder={placeholder}
                                    autoCorrect="off"
                                    type={"text"}
                                    // disabled={disabled || !!(connectedWallet && values.destination_address)}
                                    name={'manualAddress'}
                                    id={'manualAddress'}
                                    ref={inputReference}
                                    tabIndex={0}
                                    className={`${isPartnerWallet ? 'pl-11' : ''} disabled:cursor-not-allowed grow h-12 border-none leading-4  block font-semibold w-full bg-secondary-700 rounded-lg truncate hover:overflow-x-scroll focus:ring-0 focus:outline-none`}
                                />
                                {
                                    manualAddress &&
                                    <span className="inline-flex items-center mr-2">
                                        <div className="text-xs flex items-center space-x-2 md:ml-5 bg-secondary-500 rounded-md border border-secondary-500">
                                            <button
                                                type="button"
                                                className="p-0.5 duration-200 transition  hover:bg-secondary-400  rounded-md border border-secondary-500 hover:border-secondary-200"
                                                onClick={handleRemoveNewDepositeAddress}
                                            >
                                                <div className="flex items-center px-2 text-sm py-1 font-semibold">
                                                    Clear
                                                </div>
                                            </button>
                                        </div>
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
                                            onClick={() => isValidAddress(manualAddress, values.to) && setNewAddress(manualAddress)}
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
                                wrongNetwork && !currentAddress &&
                                <div className="basis-full text-xs text-primary">
                                    {
                                        destination?.internal_name === KnownInternalNames.Networks.StarkNetMainnet
                                            ? <span>Please switch to Starknet Mainnet with your wallet and click Autofill again</span>
                                            : <span>Please switch to Starknet Goerli with your wallet and click Autofill again</span>
                                    }
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


export default Address