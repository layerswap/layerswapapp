import { FC } from "react"
import Image from "next/image"
import AddressIcon from "../../../AddressIcon";
import shortenAddress from "../../../utils/ShortenAddress";
import { ChevronRight } from "lucide-react";
import { AddressGroup, AddressItem } from ".";
import { Wallet } from "../../../../stores/walletStore";

type AddressButtonProps = {
    openAddressModal: () => void;
    isPartnerWallet: boolean;
    destination_address?: string;
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partnerImage?: string;
    disabled: boolean;
}

const TruncatedAdrress = ({ address }: { address: string }) => {
    const shortAddress = shortenAddress(address)
    return <div className="text-sm leading-4 text-primary-buttonTextColor">{shortAddress}</div>
}


const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, isPartnerWallet, addressItem, connectedWallet, partnerImage, disabled }) => {
    return <button type="button" disabled={disabled} onClick={openAddressModal} className="flex rounded-lg justify-between space-x-3 items-center cursor-pointer shadow-sm mt-1.5 text-primary-text-placeholder bg-secondary-700 border-secondary-500 border disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary font-medium w-full px-3 py-7">
        <div className="truncate">
            {addressItem ?
                <div className="flex items-center gap-2">
                    <div className='flex bg-secondary-400 text-primary-text items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                        {isPartnerWallet && addressItem ?
                            <div className="shrink-0 flex items-center pointer-events-none">
                                {
                                    partnerImage &&
                                    <Image
                                        alt="Partner logo"
                                        className='rounded-md object-contain'
                                        src={partnerImage}
                                        width="36"
                                        height="36"></Image>
                                }
                            </div>
                            :
                            <AddressIcon className="scale-150 h-9 w-9" address={addressItem.address} size={36} />
                        }
                    </div>
                    <div className="text-left">
                        <TruncatedAdrress address={addressItem.address} />
                        {
                            addressItem.group === AddressGroup.ConnectedWallet && connectedWallet?.connector &&
                            <div className="text-xs text-secondary-text">
                                {connectedWallet.connector}
                            </div>
                        }
                    </div>
                </div>
                :
                <span>Address</span>
            }
        </div>
        {
            !disabled &&
            <ChevronRight className="h-4 w-4 text-primary-buttonTextColor" />
        }
    </button>
}

export default AddressButton