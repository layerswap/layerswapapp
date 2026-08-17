'use client'
import { NetworkType, type Network, type Token, type Wallet } from '@layerswap/widget-types';
import { ChevronDown, Plus, Unplug } from "lucide-react";
import { SelectAccountProps, WalletConnectionProvider, AccountIdentity } from "@layerswap/wallet-core/types";
import { FC, ReactNode, useCallback, useState } from "react";
import { clsx } from 'clsx';
import { ImageWithFallback } from "../ImageWithFallback";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import FilledCheck from "./FilledCheck";
import WalletIconView from "./WalletIconView";
import AddressIcon from "./AddressIcon";
import { ExtendedAddress } from "./ExtendedAddress";
import { useWalletListAdapters, type SaveAddressRequest } from "./adapters";

type Props = {
    selectable?: boolean;
    wallets: (Wallet | AccountIdentity)[];
    token?: Token;
    network?: Network;
    provider?: WalletConnectionProvider | undefined;
    onSelect?: (props: SelectAccountProps) => void;
    selectedAddress?: string;
    layout?: "overlay" | "standalone";
    onSaveRequest?: (request: SaveAddressRequest) => void;
    renderConnectButton?: (connect: () => void) => ReactNode;
}

const WalletsList: FC<Props> = (props) => {

    const { wallets, token, network, provider, selectable, onSelect, selectedAddress, layout = "standalone", onSaveRequest, renderConnectButton } = props

    const adapters = useWalletListAdapters()

    const connectWallet = useCallback(async () => {
        const result = await adapters.connect(provider, { layout })

        if (result && onSelect && network && result.withdrawalSupportedNetworks?.some(n => n === adapters.getNetworkId(network))) {
            onSelect({
                providerName: result.providerName,
                walletId: result.id,
                address: result.address
            })
        }
    }, [provider, onSelect, network, adapters, layout])

    const connectButton = renderConnectButton
        ? renderConnectButton(connectWallet)
        : (
            <button type='button' onClick={connectWallet} className="w-full flex justify-center p-2 bg-secondary-500 rounded-md hover:bg-secondary-400">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </button>
        )

    const walletsListBlock = wallets.length > 0 && (
        <div className="flex flex-col justify-start space-y-3">
            {
                wallets.map((item, index) => <WalletItem
                    key={`${index}${item.providerName}`}
                    account={item}
                    selectable={selectable}
                    token={token}
                    network={network}
                    onWalletSelect={onSelect}
                    selectedAddress={selectedAddress}
                    onSaveRequest={onSaveRequest}
                />)
            }
        </div>
    )

    if (layout === "overlay") {
        return (
            <div className="flex flex-col min-h-full">
                <div className="flex-1">{walletsListBlock}</div>
                <div className="mt-4">{connectButton}</div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {connectButton}
            {walletsListBlock}
        </div >
    )
}

type WalletItemProps = {
    account: AccountIdentity | Wallet,
    selectable?: boolean,
    token?: Token;
    network?: Network;
    selectedAddress: string | undefined;
    onWalletSelect?: (props: SelectAccountProps) => void;
    isCompatible?: boolean;
    onSaveRequest?: (request: SaveAddressRequest) => void;
}
export const WalletItem: FC<WalletItemProps> = ({ selectable, account: item, network, onWalletSelect, token, selectedAddress, isCompatible = true, onSaveRequest }) => {
    const adapters = useWalletListAdapters()

    const { formatted: walletBalanceAmount, isLoading: isBalanceLoading } = adapters.useWalletBalance({
        address: isCompatible ? item.address : undefined,
        network: isCompatible ? network : undefined,
        token,
    })

    const isSelected = selectable && (item.addresses.length == 1 && item.address == selectedAddress)

    const saveType = network?.type ?? (item.providerName ? item.providerName.toLowerCase() as NetworkType : undefined)
    const supportedNetworks = getWithdrawalSupportedNetworks(item)
    const saveInDrawer = !(selectable && onWalletSelect && network)
    const requestSave = (saveInDrawer && onSaveRequest)
        ? (address: string) => onSaveRequest({ address, networkType: saveType, supportedNetworks })
        : undefined

    // The row hosts nested interactive elements (disconnect tooltip button,
    // ExtendedAddress popover trigger), so it must not be a <button> itself —
    // <button> inside <button> is invalid HTML and breaks hydration.
    const isMulti = item.addresses.length > 1
    const [isExpanded, setIsExpanded] = useState(true)

    const rowIsClickable = !!(selectable && !isMulti && onWalletSelect)
    const isInteractive = rowIsClickable || isMulti
    const handleHeaderClick = () => {
        if (selectable && !isMulti && onWalletSelect) {
            onWalletSelect({
                providerName: item.providerName,
                walletId: item.id,
                address: item.address,
            })
        } else if (isMulti) {
            setIsExpanded(prev => !prev)
        }
    }

    return (
        <div className="rounded-md outline-hidden text-primary-tex">
            <div
                role={isInteractive ? 'button' : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                onClick={handleHeaderClick}
                onKeyDown={isInteractive ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleHeaderClick()
                    }
                } : undefined}
                className={clsx('w-full relative items-center justify-between gap-2 flex rounded-lg outline-hidden bg-secondary-500 text-primary-text p-3 group/addressItem', {
                    'hover:bg-secondary-400 cursor-pointer': isInteractive,
                    'bg-secondary-500': isMulti
                })}>

                <div className="flex space-x-2 items-center grow">
                    {
                        item &&
                        <div className="inline-flex items-center relative">
                            {
                                item.icon ?
                                    <WalletIconView
                                        wallet={item}
                                        size={36}
                                        className='p-0.5 rounded-md bg-secondary-800 h-9 w-9'
                                    />
                                    :
                                    <AddressIcon address={item.address} size={36} network={network} className="rounded-md bg-secondary-800" />
                            }
                            {
                                hasNetworkIcon(item) && <div className="h-5 w-5 absolute -right-1 -bottom-1">
                                    <ImageWithFallback
                                        src={item?.networkIcon || ''}
                                        alt="Wallet default network icon"
                                        height="20"
                                        width="20"
                                        loading="eager"
                                        className="object-contain rounded-md border-2 border-secondary-800 bg-secondary-800" />
                                </div>
                            }

                        </div>
                    }
                    {
                        isMulti ?
                            <div className="grow">
                                <p className="text-sm font-medium text-start">
                                    {item.addresses.length} accounts
                                </p>
                                <p className="text-xs text-secondary-text text-start">
                                    {item.displayName}
                                </p>
                            </div>
                            :
                            <div className="w-full inline-flex items-center justify-between grow">
                                <div>
                                    {
                                        !isLoading(item) && item.address &&
                                        <ExtendedAddress
                                            address={item.address}
                                            network={network}
                                            providerName={item.providerName}
                                            title={item.displayName?.split("-")[0]}
                                            description={item.providerName}
                                            logo={item.icon}
                                            showDetails
                                            addressClassNames="font-normal text-sm"
                                            onDisconnect={() => hasDisconnect(item) && item.disconnect()}
                                            onSaveRequest={requestSave ? () => requestSave(item.address) : undefined}
                                        />
                                    }
                                    <p className="text-xs text-secondary-text text-start">
                                        {item.displayName}
                                    </p>
                                </div>
                                {
                                    walletBalanceAmount !== undefined && token &&
                                    <span className="text-sm flex space-x-2 justif-end">
                                        {
                                            walletBalanceAmount ?
                                                <div className="text-right text-secondary-text font-normal text-sm">
                                                    {
                                                        isBalanceLoading ?
                                                            <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                                                            :
                                                            <>
                                                                <span>{walletBalanceAmount}</span> <span>{token?.symbol}</span>
                                                            </>
                                                    }
                                                </div>
                                                :
                                                <></>
                                        }
                                    </span>
                                }
                            </div>
                    }
                </div>
                {
                    !selectable && hasDisconnect(item) &&
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" onClick={(e) => { e.stopPropagation(); item.disconnect() }} className="text-xs text-secondary-text hover:text-primary-text rounded-full p-1.5 bg-secondary-700 transition-colors duration-200">
                                <Unplug className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Disconnect</p>
                        </TooltipContent>
                    </Tooltip>
                }
                {
                    isMulti &&
                    <ChevronDown className={clsx('h-4 w-4 text-secondary-text transition-all duration-200', {
                        'rotate-180': isExpanded
                    })} />
                }
                {
                    isSelected &&
                    <div className="flex h-6 items-center px-1">
                        <FilledCheck />
                    </div>
                }
            </div>
            {
                isMulti && isExpanded &&
                <div className='w-full grow mt-1 bg-secondary-500 rounded-lg overflow-hidden' >
                    {
                        item.addresses.map((address, index) => <NestedWalletAddress
                            key={index}
                            address={address}
                            selectable={selectable}
                            item={item}
                            network={network}
                            onWalletSelect={onWalletSelect}
                            selectedAddress={selectedAddress}
                            token={token}
                            isCompatible={isCompatible}
                            onSaveToBook={requestSave}
                        />)
                    }
                </div>
            }
        </div>
    )
}


type NestedWalletAddressProps = {
    address: string,
    selectable?: boolean,
    token?: Token;
    network?: Network;
    item: AccountIdentity | Wallet,
    onWalletSelect?: (props: SelectAccountProps) => void;
    selectedAddress: string | undefined;
    isCompatible?: boolean;
    onSaveToBook?: (address: string) => void;
}

const NestedWalletAddress: FC<NestedWalletAddressProps> = ({ selectable, address, network, onWalletSelect, token, item, selectedAddress, isCompatible, onSaveToBook }) => {
    const adapters = useWalletListAdapters()
    const { formatted: nestedWalletBalanceAmount, isLoading: isBalanceLoading } = adapters.useWalletBalance({
        address: isCompatible ? address : undefined,
        network: isCompatible ? network : undefined,
        token,
    })

    const isNestedSelected = selectable && address == selectedAddress

    // Not a <button>: ExtendedAddress inside renders its own trigger button,
    // and nested buttons are invalid HTML (hydration error).
    const rowIsClickable = !!(selectable && onWalletSelect)
    const handleRowSelect = () => rowIsClickable && onWalletSelect({
        providerName: item.providerName,
        walletId: item.id,
        address: address
    })

    return (
        <div
            role={rowIsClickable ? 'button' : undefined}
            tabIndex={rowIsClickable ? 0 : undefined}
            onClick={handleRowSelect}
            onKeyDown={rowIsClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleRowSelect()
                }
            } : undefined}
            className={clsx('flex w-full justify-between gap-3 items-center pl-6 pr-4 py-2 group/addressItem', {
                'hover:bg-secondary-400 cursor-pointer': selectable
            })}
        >
            <div className='flex items-center w-fit gap-3' >
                <div className="flex bg-secondary-400 items-center justify-center rounded-md h-8 w-8 overflow-hidden">
                    <AddressIcon
                        address={address}
                        size={32}
                        network={network}
                    />
                </div>

                <div>
                    {
                        !isLoading(item) && address &&
                        <ExtendedAddress
                            address={address}
                            network={network}
                            providerName={item.providerName}
                            addressClassNames="font-normal text-sm"
                            onDisconnect={() => hasDisconnect(item) && item?.disconnect()}

                            title={item.displayName?.split("-")[0]}
                            description={item.providerName}
                            logo={item.icon}
                            showDetails
                            onSaveRequest={onSaveToBook ? () => onSaveToBook(address) : undefined}
                        />
                    }
                </div>
            </div>
            <div className="inline-flex gap-2">
                {
                    nestedWalletBalanceAmount && token && (
                        <span className="text-sm flex space-x-2 justify-end">
                            <div className="text-right text-secondary-text font-normal text-sm">
                                {
                                    isBalanceLoading ? (
                                        <div className="h-[14px] w-20 inline-flex bg-gray-500 rounded-sm animate-pulse" />
                                    ) : (
                                        <>
                                            <span>{nestedWalletBalanceAmount}</span> <span>{token?.symbol}</span>
                                        </>
                                    )
                                }
                            </div>
                        </span>
                    )
                }
                {
                    isNestedSelected &&
                    <div className="flex h-6 items-center">
                        <FilledCheck />
                    </div>
                }
            </div>
        </div>
    )

}

function hasNetworkIcon(w: AccountIdentity | Wallet): w is Wallet & { networkIcon: string } {
    return 'networkIcon' in w && typeof w.networkIcon === 'string' && w.networkIcon !== '';
}
function hasDisconnect(w: AccountIdentity | Wallet): w is Wallet & { disconnect: Function } {
    return 'disconnect' in w && typeof w.disconnect === 'function';
}
function isLoading(w: AccountIdentity | Wallet): w is Wallet & { isLoading: boolean } {
    return 'isLoading' in w && typeof w.isLoading === 'boolean' && w.isLoading;
}
function getWithdrawalSupportedNetworks(w: AccountIdentity | Wallet): string[] {
    return 'provider' in w
        ? w.provider.withdrawalSupportedNetworks ?? []
        : w.withdrawalSupportedNetworks ?? [];
}
export default WalletsList