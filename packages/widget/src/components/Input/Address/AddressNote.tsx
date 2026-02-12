import { FC, useMemo } from "react"
import { ExternalLink } from "lucide-react"
import CopyButton from "@/components/Buttons/copyButton"
import AddressIcon from "@/components/Common/AddressIcon"
import { Partner } from "@/components/../Models/Partner"
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues"
import { getExplorerUrl } from "@/lib/address/explorerUrl"
import { Address } from "@/lib/address/Address"

type Props = {
    partner: Partner | undefined;
    values: SwapFormValues
}

const UrlAddressNote: FC<Props> = ({ partner, values }) => {

    const {
        to: destination,
        destination_address
    } = values

    const address = useMemo(() => (destination_address && destination) ? new Address(destination_address, destination).full : undefined, [destination_address, destination])

    return (
        address &&
        <div className="flex flex-col items-center gap-6 mt-2 w-full">
            <div className="h-24 w-24 rounded-2xl overflow-hidden">
                <AddressIcon className="scale-150 h-24 w-24 blur-[1.5px]" address={address} size={96} />
            </div>
            <div className="text-center max-w-xs space-y-1">
                <p className="text-2xl">Address Confirmation</p>
                <p className="text-secondary-text">
                    <span>Destination address was autofilled from URL</span> {partner && <><span>by</span> <span>{partner.display_name}.</span></>} <span>Please double-check its correctness.</span>
                </p>
            </div>

            <div className="w-full rounded-lg bg-secondary-500 overflow-hidden px-4 py-3 space-y-2">
                <div className="gap-4 flex relative items-center outline-hidden w-full text-primary-text">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-secondary-text">
                            <span>{destination?.display_name}</span> <span>address</span>
                        </div>
                        <div className="flex items-center gap-4 text-secondary-text">
                            <CopyButton toCopy={address} />
                            <a href={getExplorerUrl(destination?.account_explorer_template, address)} target="_blank">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>
                <div className='flex gap-3 text-sm items-center w-full'>
                    <div className='flex shrink-0 bg-secondary-400 text-primary-text items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                        <AddressIcon className="scale-150 h-9 w-9" address={address} size={36} />
                    </div>
                    <p className="break-all text-sm">
                        {address}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default UrlAddressNote