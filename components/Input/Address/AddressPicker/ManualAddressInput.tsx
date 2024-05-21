import { ChangeEvent, FC, useCallback, useState } from "react";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import { Pencil, X } from "lucide-react";
import { isValidAddress } from "../../../../lib/address/validator";
import Image from 'next/image';
import { Partner } from "../../../../Models/Partner";
import shortenAddress from "../../../utils/ShortenAddress";
import AddressIcon from "../../../AddressIcon";
import { NetworkType } from "../../../../Models/Network";
import FilledX from "../../../icons/FilledX";

type AddressInput = {
    manualAddress: string,
    setManualAddress: (address: string) => void,
    setNewAddress: (value: { address: string, networkType: NetworkType | string } | undefined) => void,
    values: SwapFormValues,
    partner?: Partner,
    isPartnerWallet: boolean,
    partnerImage?: string,
    name: string,
    inputReference: React.Ref<HTMLInputElement>,
    setFieldValue: (field: string, value: any) => void,
    close: () => void
}

const ManualAddressInput: FC<AddressInput> = ({ manualAddress, setManualAddress, setNewAddress, values, name, inputReference, setFieldValue, close }) => {

    const { to: destination, toExchange: destinationExchange } = values || {}
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
            if (destination) {
                setNewAddress({ address: manualAddress, networkType: destinationExchange ? destinationExchange.name : destination.type })
            }
            setFieldValue(name, manualAddress)
            setManualAddress("")
        }
        close()
    }

    let errorMessage = '';
    if (manualAddress && !isValidAddress(manualAddress, destination)) {
        errorMessage = `Enter a valid ${values.to?.display_name} address`
    }

    return (
        <div className="text-left">
            <div className="flex flex-wrap flex-col md:flex-row items-center">
                <div className="relative flex grow rounded-lg shadow-sm focus-within:ring-0 focus-within:ring-primary focus-within:border-primary w-full lg:w-fit">
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
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSaveNewAddress()
                            }
                        }}
                        className='pr-12 disabled:cursor-not-allowed grow h-12 border border-secondary-800 focus:border-primary leading-4 focus:placeholder:text-left placeholder:font-normal focus:placeholder:pl-0 placeholder:pl-8 block font-semibold w-full bg-secondary-800 rounded-lg truncate hover:overflow-x-scroll focus:ring-0 focus:outline-none'
                    />
                    {
                        !isFocused && !manualAddress &&
                        <Pencil className="h-5 w-5 text-primary-text-muted absolute inset-y-0 top-[calc(50%-10px)] left-4" />
                    }
                    {
                        manualAddress &&
                        <button
                            type="button"
                            className="absolute top-[calc(50%-10px)] right-4 hover:bg-secondary-400"
                            onClick={handleRemoveNewDepositeAddress}
                        >
                            <FilledX className="h-5 w-5" />
                        </button>
                    }

                </div>

                {
                    errorMessage &&
                    <div className="basis-full text-xs text-primary">
                        {errorMessage}
                    </div>
                }

                {
                    manualAddress && !errorMessage &&
                    <div onClick={handleSaveNewAddress} className={`text-left min-h-12 cursor-pointer space-x-2 bg-secondary-800 shadow-xl flex text-sm rounded-md items-center w-full transform hover:bg-secondary-700 transition duration-200 p-3 hover:shadow-xl mt-3`}>
                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                            <AddressIcon className="scale-150 h-9 w-9" address={manualAddress} size={36} />
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