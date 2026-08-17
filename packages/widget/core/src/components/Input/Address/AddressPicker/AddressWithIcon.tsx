import { FC, ComponentProps, useMemo } from "react"
import { AddressGroup, AddressItem } from ".";
import { Pencil, Link2, WalletIcon } from "lucide-react";
import { Partner } from "@/Models/Partner";
import { Network } from "@layerswap/widget-types";
import { ImageWithFallback, AddressIcon, ExtendedAddress } from "@layerswap/ui-kit/components";
import { shortenString } from "@layerswap/utils";
import { useAddressName } from "@/stores/addressBookStore";
import { Address } from "@/lib/address/Address";

type ExtendedAddressProps = ComponentProps<typeof ExtendedAddress>

type Props = {
    addressItem: AddressItem;
    partner?: Partner;
    network?: Network;
    balance?: { amount: number, symbol: string, isLoading: boolean } | undefined;
    onDisconnect?: ExtendedAddressProps['onDisconnect']
    onRemove?: ExtendedAddressProps['onRemove']
}

const AddressWithIcon: FC<Props> = ({ addressItem, partner, network, balance, onRemove }) => {

    const maxWalletNameWidth = calculateMaxWidth(String(balance?.amount));
    const resolvedDisplayName = useAddressName(addressItem.address, network, addressItem.providerName)

    const descriptions = [
        {
            group: AddressGroup.ManualAdded,
            text: <p>Added Manually</p>,
            icon: Pencil
        },
        {
            group: AddressGroup.ConnectedWallet,
            text: <p className={`${maxWalletNameWidth} text-ellipsis sm:max-w-full text-nowrap overflow-hidden text-[10px]`}>{addressItem.wallet?.displayName || 'Connected wallet'}</p>,
            icon: WalletIcon,
            walletIcon: addressItem.wallet?.icon,
        },
        {
            group: AddressGroup.FromQuery,
            text: <p><span>Autofilled</span> <span>{partner ? `by ${partner.display_name}` : 'from URL'}</span></p>,
            icon: Link2
        }
    ]

    const itemDescription = descriptions.find(d => d.group === addressItem.group)

    const address = useMemo(() => {
        if (network) {
            return new Address(addressItem.address, network).full
        }
        if (addressItem.providerName) {
            return new Address(addressItem.address, null, addressItem.providerName).full
        }
        return addressItem.address
    }, [addressItem.address, network, addressItem.providerName])

    return (
        <div className="w-full flex items-center justify-between">
            {
                (partner?.is_wallet && addressItem.group === AddressGroup.FromQuery) ? (
                    <div className="flex bg-secondary-400 text-primary-text items-center justify-center rounded-md h-8 overflow-hidden w-8">
                        {partner?.logo && (
                            <ImageWithFallback
                                alt="Partner logo"
                                className="rounded-md object-contain"
                                src={partner.logo}
                                width="36"
                                height="36"
                            />
                        )}
                    </div>
                ) : (
                    <AddressIcon address={address} size={36} network={network} providerName={addressItem.providerName} className="rounded-md shrink-0" />
                )
            }

            <div className="flex flex-col items-start grow min-w-0 ml-3 text-sm">
                <div className="flex w-full min-w-0">
                    {(network || addressItem?.wallet?.providerName || addressItem?.providerName) ? (
                        <ExtendedAddress
                            address={addressItem.address}
                            network={network}
                            providerName={addressItem?.wallet?.providerName ?? addressItem?.providerName}
                            showDetails={addressItem.wallet ? true : false}
                            title={addressItem.wallet?.displayName?.split("-")[0]}
                            description={addressItem.wallet?.providerName}
                            logo={addressItem.wallet?.icon}
                            onRemove={addressItem.group === AddressGroup.ManualAdded ? onRemove : undefined}
                        />
                    ) : (
                        resolvedDisplayName
                            ? <p className="text-sm font-medium flex items-baseline gap-1 min-w-0 max-w-[260px]">
                                <span className="truncate max-w-[100px]">{resolvedDisplayName}</span>
                                <span className="shrink-0 truncate">({shortenString(addressItem.address)})</span>
                            </p>
                            : <p className="text-sm block font-medium">{shortenString(addressItem.address)}</p>
                    )}
                </div>
                <div className="text-secondary-text w-full min-w-0">
                    <div className="flex items-center gap-1 text-xs">
                        {('walletIcon' in (itemDescription ?? {}) && (itemDescription as { walletIcon?: string }).walletIcon) ? (
                            <ImageWithFallback
                                src={(itemDescription as { walletIcon: string }).walletIcon}
                                alt=""
                                width="14"
                                height="14"
                                className="rounded-sm shrink-0 h-3.5 w-3.5 object-contain"
                            />
                        ) : itemDescription?.icon ? (
                            <itemDescription.icon className="rounded-sm shrink-0 h-3.5 w-3.5" />
                        ) : null}
                        {itemDescription?.text}
                    </div>
                </div>
            </div>

            {balance && (
                <div className="shrink-0 text-sm text-secondary-text text-right ml-3">
                    {
                        balance.amount != undefined && !isNaN(balance.amount) ?
                            <div className="text-right text-secondary-text font-normal text-sm">
                                {
                                    balance.isLoading ?
                                        <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                                        :
                                        <>
                                            <span>{balance.amount.toLocaleString()}</span> <span>{balance.symbol}</span>
                                        </>
                                }
                            </div>
                            :
                            <></>
                    }
                </div>
            )}
        </div>
    )
}

const calculateMaxWidth = (balance: string | undefined) => {
    const symbolCount = balance?.length || 0;

    if (symbolCount <= 6) {
        return '';
    } else if (symbolCount <= 12) {
        return 'max-w-[100px] mr-1';
    } else {
        return 'max-w-[50px]';
    }
};

export default AddressWithIcon
