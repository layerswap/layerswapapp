import { Plus, Unplug } from "lucide-react";
import AddressIcon from "../AddressIcon";
import { FC, HTMLAttributes, useCallback } from "react";
import { SelectAccountProps, Wallet, WalletProvider } from "../../Models/WalletProvider";
import { ExtendedAddress } from "../Input/Address/AddressPicker/AddressWithIcon";
import { clsx } from 'clsx';
import { useConnectModal } from "../WalletModal";
import { Network, Token } from "../../Models/Network";
import FilledCheck from "../icons/FilledCheck";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useSettingsState } from "../../context/settings";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { AccountIdentity, useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";

type Props = {
    selectable?: boolean;
    wallets: (Wallet | AccountIdentity)[];
    token?: Token;
    network?: Network;
    provider?: WalletProvider | undefined;
    onSelect?: (props: SelectAccountProps) => void;
    selectedDepositMethod?: "wallet" | "deposit_address";
}

const WalletsList: FC<Props> = (props) => {

    const { wallets, token, network, provider, selectable, onSelect, selectedDepositMethod } = props

    const { connect } = useConnectModal()

    const connectWallet = useCallback(async () => {
        const result = await connect(provider)

        if (result && onSelect && result.withdrawalSupportedNetworks?.some(n => n === network?.name)) {
            onSelect({
                providerName: result.providerName,
                walletId: result.id,
                address: result.address
            })
        }

    }, [provider, onSelect, network])

    const selectedSourceAccount = useSelectedAccount("from", selectedDepositMethod == 'wallet' ? network?.name : undefined);

    return (
        <div className="space-y-3">
            <button type='button' onClick={connectWallet} className="w-full flex justify-center p-2 bg-secondary-500 rounded-md hover:bg-secondary-400">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </button>
            {
                wallets.length > 0 &&
                <div className="flex flex-col justify-start space-y-3">
                    {
                        wallets.map((wallet, index) => <WalletItem
                            key={`${index}${wallet.providerName}`}
                            account={wallet}
                            selectable={selectable}
                            token={token}
                            network={network}
                            onWalletSelect={onSelect}
                            selectedAddress={selectedSourceAccount?.address}
                        />)
                    }
                </div>
            }
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
}
export const WalletItem: FC<WalletItemProps> = ({ selectable, account: wallet, network, onWalletSelect, token, selectedAddress, isCompatible = true }) => {
    const { networks } = useSettingsState()
    const balanceNetwork = token ? networks.find(n => n.name === network?.name && n.tokens.some(t => t.symbol === token.symbol)) : undefined

    const { balances, isLoading: isBalanceLoading } = useBalance(
        isCompatible ? wallet.address : undefined,
        isCompatible ? balanceNetwork : undefined
    )

    const walletBalance = balances?.find(b => b?.token === token?.symbol)

    const isSelected = selectable && (wallet.addresses.length == 1 && wallet.address == selectedAddress)
    const walletBalanceAmount = walletBalance?.amount !== undefined ? truncateDecimals(walletBalance.amount, token?.precision) : ''

    return (
        <div className="rounded-md outline-hidden text-primary-tex">
            <button
                type="button"
                onClick={() => (selectable && wallet.addresses.length == 1 && onWalletSelect) && onWalletSelect({
                    providerName: wallet.providerName,
                    walletId: wallet.id,
                    address: wallet.address
                })}
                className={clsx('w-full relative items-center justify-between gap-2 flex rounded-lg outline-hidden bg-secondary-500 text-primary-text p-3 group/addressItem', {
                    'hover:bg-secondary-400 cursor-pointer': selectable && wallet.addresses.length == 1,
                    'bg-secondary-600 py-2': wallet.addresses.length > 1
                })}>

                <div className="flex space-x-2 items-center grow">
                    {
                        wallet &&
                        <div className="inline-flex items-center relative">
                            <wallet.icon
                                className={clsx('w-9 h-9 p-0.5 rounded-md bg-secondary-800', {
                                    'w-6! h-6!': wallet.addresses.length > 1,
                                })}
                            />
                            {
                                hasNetworkIcon(wallet) && <div className="h-5 w-5 absolute -right-1 -bottom-1">
                                    <ImageWithFallback
                                        src={wallet?.networkIcon || ''}
                                        alt="Wallet default network icon"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="object-contain rounded-md border-2 border-secondary-800" />
                                </div>
                            }

                        </div>
                    }
                    {
                        wallet.addresses.length > 1 ?
                            <div className="text-sm">
                                {wallet.displayName}
                            </div>
                            :
                            <div className="w-full inline-flex items-center justify-between grow">
                                <div>
                                    {
                                        !isLoading(wallet) && wallet.address &&
                                        <ExtendedAddress
                                            address={wallet.address}
                                            network={network}
                                            providerName={wallet.providerName}
                                            title={wallet.displayName?.split("-")[0]}
                                            description={wallet.providerName}
                                            logo={wallet.icon}
                                            showDetails
                                            addressClassNames="font-normal text-sm"
                                            onDisconnect={() => hasDisconnect(wallet) && wallet.disconnect()}
                                        />
                                    }
                                    <p className="text-xs text-secondary-text text-start">
                                        {wallet.displayName}
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
                    !selectable && hasDisconnect(wallet) &&
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" onClick={wallet.disconnect} className="text-xs text-secondary-text hover:text-primary-text rounded-full p-1.5 bg-secondary-700 transition-colors duration-200 ">
                                <Unplug className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Disconnect</p>
                        </TooltipContent>
                    </Tooltip>
                }
                {
                    isSelected &&
                    <div className="flex h-6 items-center px-1">
                        <FilledCheck />
                    </div>
                }
            </button>
            {
                wallet.addresses.length > 1 &&
                <div className='w-full grow py-1 mt-1 bg-secondary-500 rounded-lg' >
                    {
                        wallet.addresses.map((address, index) => <NestedWalletAddress
                            key={index}
                            address={address}
                            selectable={selectable}
                            wallet={wallet}
                            network={network}
                            onWalletSelect={onWalletSelect}
                            selectedAddress={selectedAddress}
                            token={token}
                            isCompatible={isCompatible}
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
    wallet: AccountIdentity | Wallet,
    onWalletSelect?: (props: SelectAccountProps) => void;
    selectedAddress: string | undefined;
    isCompatible?: boolean;
}

const NestedWalletAddress: FC<NestedWalletAddressProps> = ({ selectable, address, network, onWalletSelect, token, wallet, selectedAddress, isCompatible }) => {
    const { networks } = useSettingsState()
    const balanceNetwork = token ? networks.find(n => n.name === network?.name && n.tokens.some(t => t.symbol === token.symbol)) : undefined
    const { balances, isLoading: isBalanceLoading } = useBalance(
        isCompatible ? address : undefined,
        isCompatible ? balanceNetwork : undefined
    )

    const isNestedSelected = selectable && address == selectedAddress
    const nestedWalletBalance = balances?.find(b => b?.token === token?.symbol)
    const nestedWalletBalanceAmount = nestedWalletBalance?.amount !== undefined ? truncateDecimals(nestedWalletBalance.amount, token?.precision) : ''

    return (
        <button
            type="button"
            disabled={!selectable}
            onClick={() => (selectable && onWalletSelect) && onWalletSelect({
                providerName: wallet.providerName,
                walletId: wallet.id,
                address: address
            })}
            className={clsx('flex w-full justify-between gap-3 items-center pl-6 pr-4 py-2 group/addressItem', {
                'hover:bg-secondary-400 cursor-pointer': selectable
            })}
        >
            <div className='flex items-center w-fit gap-3' >
                <div className="flex bg-secondary-400 items-center justify-center rounded-md h-8 w-8 overflow-hidden">
                    <AddressIcon
                        className="scale-150 h-8 w-8 p-0.5"
                        address={address}
                        size={32}
                    />
                </div>

                <div>
                    {
                        !isLoading(wallet) && address &&
                        <ExtendedAddress
                            address={address}
                            network={network}
                            providerName={wallet.providerName}
                            addressClassNames="font-normal text-sm"
                            onDisconnect={() => hasDisconnect(wallet) && wallet?.disconnect()}
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
        </button>
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
export default WalletsList
