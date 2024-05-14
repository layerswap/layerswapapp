import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddressBookItem } from "../../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import { History, Pencil } from "lucide-react";
import KnownInternalNames from "../../../../lib/knownIds";
import { isValidAddress } from "../../../../lib/address/validator";
import { Partner } from "../../../../Models/Partner";
import shortenAddress from "../../../utils/ShortenAddress";
import useWallet from "../../../../hooks/useWallet";
import { CommandGroup, CommandList, CommandWrapper } from "../../../shadcn/command";
import AddressIcon from "../../../AddressIcon";
import { addressFormat } from "../../../../lib/address/formatter";
import ManualAddressInput from "./ManualAddressInput";
import Modal from "../../../modal/modal";
import ResizablePanel from "../../../ResizablePanel";
import FilledCheck from "../../../icons/FilledCheck";
import ConnectWalletButton from "./ConnectWalletButton";
import ExchangeNote from "./ExchangeNote";
import { NetworkType, RouteNetwork } from "../../../../Models/Network";
import { Exchange } from "../../../../Models/Exchange";

enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    RecentlyUsed = "Recently used"
}

export enum ExchangeType {
    Exchange = 'exchange'
}

type AddressItem = {
    address: string,
    group: AddressGroup,
    networkType?: NetworkType | ExchangeType
    date?: string
}

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    showAddressModal: boolean;
    setShowAddressModal: (show: boolean) => void;
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
    ({ showAddressModal, setShowAddressModal, name, canFocus, close, address_book, disabled, isPartnerWallet, partnerImage, partner, wrongNetwork }, ref) {
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const inputReference = useRef<HTMLInputElement>(null);
    const { destination_address, to: destination, toExchange: destinationExchange, toCurrency: destinationAsset } = values

    const [manualAddress, setManualAddress] = useState<string>('')
    const [newAddress, setNewAddress] = useState<{ address: string, networkType: NetworkType | ExchangeType } | undefined>()
    const { connectWallet, getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values?.to && getProvider(values?.to)
    }, [values?.to, getProvider])

    const connectedWallet = provider?.getConnectedWallet()
    const connectedWalletAddress = connectedWallet?.address

    const menuItems = destination && generateMenuItems({ address_book, destination, destinationExchange, connectedWalletAddress, newAddress })

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    const handleSelectAddress = useCallback((value: string) => {
        const address = destination && menuItems?.find(a => addressFormat(a.address, destination) === addressFormat(value, destination))?.address
        setFieldValue("destination_address", address)
        close()
    }, [close, setFieldValue])

    const filteredAddresses = menuItems?.filter(a => a.group !== AddressGroup.ConnectedWallet)

    return (<>
        <Modal
            header={
                <div className="w-full">
                    <span>To</span> <span>{(destinationExchange?.display_name ?? values?.to?.display_name) || ''}</span> <span>address</span>
                </div>
            }
            height="fit"
            show={showAddressModal} setShow={setShowAddressModal}
            modalId="address"
        >
            <ResizablePanel>
                <div className='w-full flex flex-col justify-between h-full text-primary-text pt-2 min-h-[400px]'>
                    <div className='flex flex-col self-center grow w-full'>
                        <div className='flex flex-col self-center grow w-full space-y-3'>

                            {
                                destinationExchange ?
                                    <ExchangeNote destination={destination} destinationAsset={destinationAsset} destinationExchange={destinationExchange} />
                                    :
                                    !disabled
                                    && destination
                                    && provider &&
                                    <ConnectWalletButton provider={provider} connectedWallet={connectedWallet} onClick={() => { connectedWallet ? handleSelectAddress(connectedWallet.address) : connectWallet(provider.name) }} destination={destination} destination_address={destination_address} />
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
                                (destinationExchange || provider) &&
                                <hr className="border-secondary-500 w-full" />
                            }

                            <ManualAddressInput
                                manualAddress={manualAddress}
                                setManualAddress={setManualAddress}
                                setNewAddress={setNewAddress}
                                values={values}
                                partner={partner}
                                isPartnerWallet={isPartnerWallet}
                                partnerImage={partnerImage}
                                name={name}
                                inputReference={inputReference}
                                setFieldValue={setFieldValue}
                                close={close}
                            />

                            {
                                !disabled && filteredAddresses && filteredAddresses?.length > 0 && !manualAddress &&
                                <div className="text-left">
                                    <CommandWrapper>
                                        <CommandList>
                                            <CommandGroup
                                                heading="Address Book"
                                                className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-0 !py-0 !px-0 mt-2"
                                            >
                                                <div className="space-y-0 w-full flex flex-col items-stretch">
                                                    {filteredAddresses.sort((a, b) =>
                                                        (a.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24))) : 0)
                                                        - (b.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(b.date).getTime()) / (1000 * 3600 * 24))) : 0)
                                                    ).map(item => {
                                                        const difference_in_days = item.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(item.date).getTime()) / (1000 * 3600 * 24))) : undefined

                                                        return (
                                                            <button type="button" key={item.address} onClick={() => handleSelectAddress(item.address)} className={`px-3 py-3 rounded-md hover:bg-secondary-700 w-full transition duration-200 ${addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                                                                <div className={`flex items-center justify-between w-full`}>
                                                                    <div className={`flex gap-3 text-sm items-center`}>
                                                                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                                                                            <AddressIcon className="scale-150 h-9 w-9" address={item.address} size={36} />
                                                                        </div>
                                                                        <div className="flex flex-col items-start">
                                                                            <div className="block text-sm font-medium">
                                                                                {shortenAddress(item.address)}
                                                                            </div>
                                                                            <div className="text-secondary-text">
                                                                                {
                                                                                    item.group === AddressGroup.RecentlyUsed &&
                                                                                    <div className="inline-flex items-center gap-1">
                                                                                        <History className="h-3 w-3" />
                                                                                        {
                                                                                            (difference_in_days === 0 ?
                                                                                                <p>Used today</p>
                                                                                                :
                                                                                                (difference_in_days && difference_in_days > 1 ?
                                                                                                    <p><span>Used</span> {difference_in_days} <span>days ago</span></p>
                                                                                                    : <p>Used yesterday</p>))
                                                                                        }
                                                                                    </div>
                                                                                }
                                                                                {
                                                                                    item.group === AddressGroup.ManualAdded &&
                                                                                    <div className="inline-flex items-center gap-1">
                                                                                        <Pencil className="h-3 w-3" />
                                                                                        {
                                                                                            (difference_in_days === 0 ?
                                                                                                <p>Added today</p>
                                                                                                :
                                                                                                (difference_in_days && difference_in_days > 1 ?
                                                                                                    <p><span>Added</span> {difference_in_days} <span>days ago</span></p>
                                                                                                    : <p>Added yesterday</p>))
                                                                                        }
                                                                                    </div>
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex h-6 items-center px-1">
                                                                        {
                                                                            addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) &&
                                                                            <FilledCheck />
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </CommandGroup>
                                        </CommandList>
                                    </CommandWrapper>
                                </div>
                            }
                        </div>
                    </div>
                </div >
            </ResizablePanel>
        </Modal>
    </>
    )
});


const generateMenuItems = ({
    address_book,
    destination,
    destinationExchange,
    connectedWalletAddress,
    newAddress,
}: {
    address_book: AddressBookItem[] | undefined,
    destination: RouteNetwork | undefined,
    destinationExchange: Exchange | undefined,
    connectedWalletAddress: string | undefined,
    newAddress: { address: string, networkType: NetworkType | ExchangeType } | undefined,
}) => {
    const recentlyUsedAddresses = address_book?.filter(a => destinationExchange ? a.exchanges.some(e => destinationExchange.name === e) : a.networks?.some(n => destination?.name === n) && isValidAddress(a.address, destination)) || []

    if (!destination) return

    let addresses: AddressItem[] = []

    if (recentlyUsedAddresses && destination) addresses = [...addresses.filter(a => !recentlyUsedAddresses.find(ra => ra.address === a.address)), ...recentlyUsedAddresses.map(ra => ({ address: ra.address, date: ra.date, group: AddressGroup.RecentlyUsed, networkType: destinationExchange ? ExchangeType.Exchange : destination.type }))]
    if (connectedWalletAddress && destination) addresses = [...addresses.filter(a => addressFormat(connectedWalletAddress, destination) !== addressFormat(a.address, destination)), { address: connectedWalletAddress, group: AddressGroup.ConnectedWallet, networkType: destination.type }]
    if (newAddress?.address && destination) addresses = [...addresses.filter(a => a.group !== AddressGroup.ManualAdded && addressFormat(newAddress.address, destination) !== addressFormat(a.address, destination)), { address: newAddress.address, date: new Date().toJSON(), group: AddressGroup.ManualAdded, networkType: newAddress.networkType }]

    return addresses.filter(a => a.networkType === (destinationExchange ? ExchangeType.Exchange : destination?.type))

}

export default AddressPicker