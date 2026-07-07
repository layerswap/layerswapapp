import { ChangeEvent, FC, useCallback, useState } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Pencil } from "lucide-react";
import { Partner } from "@/Models/Partner";
import { NetworkType } from "@/Models/Network";
import FilledX from "@/components/icons/FilledX";
import { AddressGroup, AddressItem } from ".";
import { Address } from "@/lib/address";
import AddressPickerItem from "./AddressPickerItem";
import SaveToBookInline from "@/components/AddressBook/SaveToBookInline";
import { Wallet } from "@/Models/WalletProvider";
import { FormikHelpers } from "formik";
import { useAddressName } from "@/stores/addressBookStore";

type AddressInput = {
    manualAddress: string,
    setManualAddress: (address: string) => void,
    setNewAddress: (value: { address: string, networkType: NetworkType | string } | undefined) => void,
    values: SwapFormValues,
    partner?: Partner,
    name: string,
    inputReference: React.Ref<HTMLInputElement>,
    setFieldValue: FormikHelpers<SwapFormValues>['setFieldValue'],
    close: () => void,
    addresses: AddressItem[] | undefined,
    connectedWallet: Wallet | undefined
}

const ManualAddressInput: FC<AddressInput> = ({ manualAddress, setManualAddress, setNewAddress, values, name, inputReference, setFieldValue, close, addresses, partner }) => {
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
        if (Address.isValid(manualAddress, destination) && destination) {
            if (destination) {
                setNewAddress({ address: manualAddress, networkType: destination.type })
            }
            setManualAddress("")
        }
        else if (!destination) {
            setFieldValue('destination_address', manualAddress)
        }
        close()
    }

    let errorMessage = '';
    if (manualAddress && !Address.isValid(manualAddress, destination) && values.to?.display_name) {
        errorMessage = `Enter a valid ${values.to?.display_name} address`
    }

    const addressFromList = destination && addresses?.find(a => Address.equals(a.address, manualAddress, destination))
    const isAddressValid = Boolean(manualAddress && destination && Address.isValid(manualAddress, destination))
    const existingBookName = useAddressName(isAddressValid ? manualAddress : undefined, destination)
    const canSaveToAddressBook = isAddressValid && !existingBookName

    return (
        <div className="text-left">
            <div className="flex flex-wrap flex-col md:flex-row items-center">
                <div className="relative flex grow rounded-lg shadow-xs focus-within:ring-0 focus-within:ring-primary focus-within:border-primary w-full lg:w-fit">
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
                        className='pr-12 disabled:cursor-not-allowed grow h-12 border border-secondary-800 focus:border-primary leading-4 placeholder:text-primary-text-tertiary/80 focus:placeholder:text-left placeholder:font-normal focus:placeholder:pl-0 placeholder:pl-8 block font-semibold w-full !bg-secondary-500 rounded-lg truncate hover:overflow-x-scroll focus:ring-0 focus:outline-hidden'
                    />
                    {
                        !isFocused && !manualAddress &&
                        <Pencil className="h-5 w-5 text-primary-text-tertiary absolute inset-y-0 top-[calc(50%-10px)] left-4" />
                    }
                    {
                        manualAddress &&
                        <button
                            type="button"
                            className="absolute top-1/2 -translate-y-1/2 right-3 text-secondary-text hover:text-primary-text transition"
                            onClick={handleRemoveNewDepositeAddress}
                        >
                            <FilledX className="h-5 w-5" />
                        </button>
                    }

                </div>

                {
                    errorMessage &&
                    <div className="basis-full w-full text-start text-xs text-primary">
                        {errorMessage}
                    </div>
                }

                {
                    manualAddress && !errorMessage &&
                    <AddressPickerItem item={addressFromList || { address: manualAddress, group: AddressGroup.ManualAdded }} network={destination} partner={partner} onClick={handleSaveNewAddress} className="mt-3 min-h-12" />
                }
                {canSaveToAddressBook && <SaveToBookInline key={manualAddress} address={manualAddress} network={destination!} />}
            </div>
        </div>
    )
}

export default ManualAddressInput