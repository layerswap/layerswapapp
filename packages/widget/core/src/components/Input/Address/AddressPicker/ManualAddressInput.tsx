import { NetworkType, type Wallet } from '@layerswap/widget-types';
import { FC } from "react";
import { Partner } from "@/Models/Partner";
import { AddressGroup, AddressItem } from ".";
import { Address } from "@/lib/address/Address";
import { FormikHelpers } from "formik";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useAddressName } from "@/stores/addressBookStore";
import SaveToBookInline from "@/components/AddressBook/SaveToBookInline";
import AddressPickerItem from "./AddressPickerItem";
import AddressTextInput from "../AddressTextInput";

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
                <AddressTextInput
                    value={manualAddress}
                    onChange={setManualAddress}
                    name={name}
                    inputRef={inputReference}
                    onEnter={handleSaveNewAddress}
                />

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
