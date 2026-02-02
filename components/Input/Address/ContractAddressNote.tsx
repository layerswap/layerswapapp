import { FC, useState, useEffect } from "react"
import AddressIcon from "@/components/AddressIcon"
import { SwapFormValues } from "@/components/DTOs/SwapFormValues"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Address } from "@/lib/address"

type Props = {
    values: SwapFormValues
    onDontShowAgainChange?: (checked: boolean) => void
}

const ContractAddressNote: FC<Props> = ({ values, onDontShowAgainChange }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false)

    const {
        to: destination,
        destination_address
    } = values

    useEffect(() => {
        onDontShowAgainChange?.(dontShowAgain)
    }, [dontShowAgain, onDontShowAgainChange])

    const handleCheckboxChange = () => {
        setDontShowAgain(!dontShowAgain)
    }

    return (
        destination && destination_address &&
        <div className="flex flex-col items-center gap-4 mt-2 w-full">
            <div className="h-24 w-24 rounded-2xl overflow-hidden">
                <AddressIcon className="scale-150 h-24 w-24 blur-[1.5px]" address={new Address(destination_address, destination).full} size={96} />
            </div>
            <div className="text-center max-w-xs space-y-1">
                <p className="text-2xl">Address Confirmation</p>
                <p className="text-secondary-text">
                    <span>Destination address is a contract in a network but not in </span><span>{destination?.display_name || 'the destination'}</span><span> network. Please double-check your destination address.</span>
                </p>
            </div>
            <div className="flex items-center gap-2 self-start">
                <Checkbox
                    id="dont-show-again"
                    checked={dontShowAgain}
                    onClick={handleCheckboxChange}
                />
                <label htmlFor="dont-show-again" className="w-full cursor-pointer">
                    <span className="text-sm text-secondary-text">Don&apos;t show this again</span>
                </label>
            </div>
        </div>
    )
}

export default ContractAddressNote