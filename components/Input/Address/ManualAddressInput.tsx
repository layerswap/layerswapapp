import { ChangeEvent, FC, useCallback, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Info, Pencil, X } from "lucide-react";
import { isValidAddress } from "../../../lib/address/validator";
import Image from 'next/image';
import { Partner } from "../../../Models/Partner";
import shortenAddress from "../../utils/ShortenAddress";
import { AddressItem } from "../../../stores/addressBookStore";
import AddressIcon from "../../AddressIcon";
import { addressFormat } from "../../../lib/address/formatter";

type AddressInput = {
    manualAddress: string,
    setManualAddress: (address: string) => void,
    setNewAddress: (address: string) => void,
    addresses: AddressItem[],
    values: SwapFormValues,
    partner?: Partner,
    isPartnerWallet: boolean,
    partnerImage?: string,
    name: string,
    inputReference: React.Ref<HTMLInputElement>,
    setFieldValue: (field: string, value: any) => void,
    close: () => void
}

const ManualAddressInput: FC<AddressInput> = ({ manualAddress, setManualAddress, setNewAddress, addresses, values, partner, isPartnerWallet, partnerImage, name, inputReference, setFieldValue, close }) => {

    const { to: destination } = values || {}
    const [isFocused, setIsFocused] = useState(false);

    const placeholder = "Enter address"

    const handleRemoveNewDepositeAddress = useCallback(async () => {
        setManualAddress('')
    }, [setManualAddress])

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setManualAddress(e.target.value)
    }, [])

    const handleSaveNewAddress = () => {
        if (isValidAddress(manualAddress, destination)) {
            if (destination && !addresses.some(a => addressFormat(a.address, destination) === addressFormat(manualAddress, destination))) {
                setNewAddress(manualAddress)
            }
            setFieldValue(name, manualAddress)
            setManualAddress("")
        }
        close()
    }

    const destinationAsset = values.toCurrency

    let errorMessage = '';
    if (manualAddress && !isValidAddress(manualAddress, destination)) {
        errorMessage = `Enter a valid ${values.to?.display_name} address`
    }

    return (
        <div className="text-left">
            {isPartnerWallet && partner && <span className='truncate text-sm text-secondary-text'> ({partner?.display_name})</span>}
            <div className="flex flex-wrap flex-col md:flex-row items-center">
                <div className="relative flex grow rounded-lg shadow-sm bg-secondary-700 focus-within:ring-0 focus-within:ring-primary focus-within:border-primary w-full lg:w-fit">
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
                        name={name}
                        id={name}
                        ref={inputReference}
                        tabIndex={0}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`${isPartnerWallet ? 'pl-11' : ''} disabled:cursor-not-allowed grow h-12 border-none leading-4 focus:bg-secondary-600 focus:placeholder:text-left focus:placeholder:pl-0 placeholder:pl-6 placeholder:text-center placeholder:text-secondary-text block font-semibold w-full bg-secondary-700 rounded-lg truncate hover:overflow-x-scroll focus:ring-0 focus:outline-none`}
                    />
                    {
                        !isFocused &&
                        <Pencil className="h-5 w-5 text-secondary-text absolute inset-y-0 top-[calc(50%-10px)] right-[calc(50%+50px)]" />
                    }
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
                    </div>
                }
            </div>
        </div>
    )
}

export default ManualAddressInput