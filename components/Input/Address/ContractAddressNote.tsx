import { FC } from "react"
import { ExternalLink } from "lucide-react"
import CopyButton from "@/components/buttons/copyButton"
import Link from "next/link"
import AddressIcon from "@/components/AddressIcon"
import { SwapFormValues } from "@/components/DTOs/SwapFormValues"
import { Partner } from "@/Models/Partner"

type Props = {
    values: SwapFormValues
}

const ContractAddressNote: FC<Props> = ({ values }) => {

    const {
        from: source,
        to: destination,
        destination_address
    } = values

    return (
        destination && destination_address &&
        <div className="flex flex-col items-center gap-6 mt-2 w-full">
            <div className="h-24 w-24 rounded-2xl overflow-hidden">
                <AddressIcon className="scale-150 h-24 w-24 blur-[1.5px]" address={destination_address} size={96} />
            </div>
            <div className="text-center max-w-xs space-y-1">
                <p className="text-2xl">Address Confirmation</p>
                <p className="text-secondary-text">
                    <span>Destination address is a contract in a network but not in </span><span>{destination?.display_name || 'the destination'}</span><span> network. Please double-check your destination address.</span>
                </p>
            </div>
        </div>
    )
}

export default ContractAddressNote