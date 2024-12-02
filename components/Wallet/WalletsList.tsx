import { Plus, Power } from "lucide-react";
import AddressIcon from "../AddressIcon";
import { Wallet, WalletProvider } from "../../Models/WalletProvider";
import { FC } from "react";
import { ExtendedAddress } from "../Input/Address/AddressPicker/AddressWithIcon";
import { clsx } from 'clsx';
import { useConnectModal } from "../WalletModal";
import { useBalancesState } from "../../context/balances";
import { Network, Token } from "../../Models/Network";
import { useSwapDataState } from "../../context/swap";
import FilledCheck from "../icons/FilledCheck";
import { truncateDecimals } from "../utils/RoundDecimals";

type Props = {
    wallets: Wallet[];
    token?: Token;
    network?: Network;
    provider?: WalletProvider;
    selectable?: boolean;
    onSelect?: (wallet: Wallet, address: string) => void;
}

const WalletsList: FC<Props> = ({ wallets, selectable, onSelect, provider, token, network }) => {

    const { connect } = useConnectModal()
    const { balances, isBalanceLoading } = useBalancesState()
    const { selectedSourceAccount } = useSwapDataState()

    const connectWallet = async () => {
        const result = await connect(provider)

        if (result && onSelect) {
            onSelect(result, result.address)
        }

    }

    return (
        <div className="space-y-3">
            <button type='button' onClick={connectWallet} className="w-full flex justify-center p-2 bg-secondary-700 rounded-md hover:bg-secondary-600">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </button>
            <div className="flex flex-col justify-start space-y-3">
                {
                    wallets.map((wallet, index) => {

                        const isSelected = selectable && (wallet.addresses.length == 1 && wallet.address == selectedSourceAccount?.address)
                        const walletBalance = (network && token) && balances[wallet.address]?.find(b => b?.network === network?.name && b?.token === token?.symbol)
                        const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, token?.precision)

                        return (
                            <div key={index} className="rounded-md outline-none text-primary-tex">
                                <div
                                    onClick={() => (selectable && wallet.addresses.length == 1 && onSelect) && onSelect(wallet, wallet.address)}
                                    className={clsx('w-full relative items-center justify-between gap-2 flex rounded-lg outline-none bg-secondary-700 text-primary-text p-3 group/addressItem', {
                                        'hover:bg-secondary-600 cursor-pointer': selectable && wallet.addresses.length == 1
                                    })}>

                                    <div className="flex space-x-4 items-center grow">
                                        {
                                            wallet.connector &&
                                            <div className="inline-flex items-center relative">
                                                <wallet.icon className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                            </div>
                                        }
                                        {
                                            wallet.addresses.length > 1 ?
                                                <div>
                                                    <span className="text-base">{wallet.connector}</span>
                                                </div>
                                                : <div className="w-full inline-flex items-center justify-between grow">
                                                    <div>
                                                        {
                                                            !wallet.isLoading && wallet.address &&
                                                            <ExtendedAddress
                                                                address={wallet.address}
                                                                network={network}
                                                                addressClassNames="font-normal text-sm"
                                                            />
                                                        }
                                                        <p className="text-xs text-secondary-text">
                                                            {wallet.connector}
                                                        </p>
                                                    </div>
                                                    {
                                                        walletBalanceAmount !== undefined && token &&
                                                        <span className="text-sm flex space-x-2 justif-end">
                                                            {
                                                                walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) ?
                                                                    <div className="text-right text-secondary-text font-normal text-sm">
                                                                        {
                                                                            isBalanceLoading ?
                                                                                <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-sm animate-pulse' />
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
                                        !selectable &&
                                        <button type="button" onClick={wallet.disconnect} className="text-xs text-secondary-text hover:text-primary-text rounded-full p-1.5 bg-secondary-900 hover:bg-secondary-950 transition-colors duration-200 ">
                                            <Power className="h-3.5 w-3.5" />
                                        </button>
                                    }
                                    {
                                        isSelected &&
                                        <div className="flex h-6 items-center px-1">
                                            <FilledCheck />
                                        </div>
                                    }
                                </div>
                                {
                                    wallet.addresses.length > 1 &&
                                    <div className='w-full grow py-1 mt-1 bg-secondary-700 rounded-lg' >
                                        {
                                            wallet.addresses.map((address, index) => {

                                                const isNestedSelected = selectable && address == selectedSourceAccount?.address
                                                const nestedWalletBalance = (network && token) && balances[address]?.find(b => b?.network === network?.name && b?.token === token?.symbol)
                                                const nestedWalletBalanceAmount = nestedWalletBalance?.amount && truncateDecimals(nestedWalletBalance?.amount, token?.precision)
                                                return (
                                                    <div
                                                        onClick={() => (selectable && onSelect) && onSelect(wallet, address)}
                                                        key={index}
                                                        className={clsx('flex w-full justify-between gap-3 items-center pl-6 pr-4 py-2 group/addressItem', {
                                                            'hover:bg-secondary-600 cursor-pointer': selectable
                                                        })}
                                                    >
                                                        <div className='flex items-center w-fit gap-3' >
                                                            <div className="flex bg-secondary-400  items-center justify-center rounded-md h-6 overflow-hidden w-6 ">
                                                                <AddressIcon
                                                                    className="scale-150 h-6 w-6 p-0.5"
                                                                    address={address}
                                                                    size={24}
                                                                />
                                                            </div>

                                                            <div>
                                                                {
                                                                    !wallet.isLoading && address &&
                                                                    <ExtendedAddress
                                                                        address={address}
                                                                        network={network}
                                                                        addressClassNames="font-normal text-sm"
                                                                    />
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="inline-flex gap-2">
                                                            {
                                                                nestedWalletBalanceAmount !== undefined && token &&
                                                                <span className="text-sm flex space-x-2 justif-end">
                                                                    {
                                                                        nestedWalletBalanceAmount != undefined && !isNaN(nestedWalletBalanceAmount) ?
                                                                            <div className="text-right text-secondary-text font-normal text-sm">
                                                                                {
                                                                                    isBalanceLoading ?
                                                                                        <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                                                                                        :
                                                                                        <>
                                                                                            <span>{nestedWalletBalanceAmount}</span> <span>{token?.symbol}</span>
                                                                                        </>
                                                                                }
                                                                            </div>
                                                                            :
                                                                            <></>
                                                                    }
                                                                </span>
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
                                            })
                                        }
                                    </div>
                                }
                            </div>
                        )
                    }
                    )
                }
            </div>
        </div >
    )
}
export default WalletsList
