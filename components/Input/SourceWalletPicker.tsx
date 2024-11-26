import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useState } from "react";
import useWallet, { WalletPurpose } from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import { ChevronDown, Plus } from "lucide-react";
import { Network, Token } from "../../Models/Network";
import ConnectButton from "../buttons/connectButton";
import FilledCheck from "../icons/FilledCheck";
import Balance from "./dynamic/Balance";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import VaulDrawer from "../modal/vaulModal";
import useBalance from "../../hooks/useBalance";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import AddressWithIcon from "./Address/AddressPicker/AddressWithIcon";
import { AddressGroup } from "./Address/AddressPicker";
import { Wallet } from "../../Models/WalletProvider";
import WalletIcon from "../icons/WalletIcon";

const Component: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const { setSelectedSourceAccount } = useSwapDataUpdate()
    const { selectedSourceAccount } = useSwapDataState()
    const walletNetwork = values.fromExchange ? undefined : values.from
    const source_token = values.fromCurrency
    const destination_address = values.destination_address
    const { provider } = useWallet(walletNetwork, 'withdrawal')
    const { fetchBalance } = useBalance()
    const wallets = provider?.connectedWallets || []

    const selectedWallet = selectedSourceAccount?.wallet
    //TODO: sort by active wallet
    const defaultWallet = walletNetwork && wallets?.find(w => !w.isNotAvailable)
    const source_addsress = selectedSourceAccount?.address
    const connectedWallets = provider?.connectedWallets

    useEffect(() => {
        if (!source_addsress && defaultWallet && values.depositMethod !== 'deposit_address') {
            setSelectedSourceAccount({
                wallet: defaultWallet,
                address: defaultWallet.address
            })
        }
    }, [defaultWallet, source_addsress, values.depositMethod, destination_address])

    useEffect(() => {
        if (values.depositMethod === 'deposit_address' || !defaultWallet?.address || (selectedSourceAccount && !wallets.some(w => w?.addresses?.some(a => a === selectedSourceAccount.address)))) {
            setSelectedSourceAccount(undefined)
        }
    }, [values.depositMethod, defaultWallet?.address, wallets.length])

    useEffect(() => {
        if (walletNetwork && source_token) {
            connectedWallets?.forEach(wallet => {
                wallet.addresses.forEach(address => {
                    fetchBalance(walletNetwork, source_token, address);
                })
            })
        }
    }, [walletNetwork, connectedWallets?.length, source_token])

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = (wallet?: Wallet | undefined, address?: string | undefined) => {
        if (wallet && address) {
            setSelectedSourceAccount({
                wallet,
                address
            })
            setFieldValue('depositMethod', 'wallet')
        }
        else {
            setSelectedSourceAccount(undefined)
            setFieldValue('depositMethod', 'deposit_address')
        }
        setOpenModal(false)
    }

    if (!walletNetwork || !source_token)
        return <></>

    return <>
        {
            values.depositMethod === 'deposit_address' ?
                <div className="flex items-center space-x-2 text-sm leading-4">
                    <div onClick={handleWalletChange} className="rounded-md bg-secondary-500 flex space-x-1 items-center py-0.5 pl-2 pr-1 cursor-pointer">
                        <div className="text-secondary-text">
                            Deposit address
                        </div>
                        <div className="w-5 h-5 items-center flex">
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </div>
                    </div>
                </div>
                :
                <div className="rounded-lg bg-secondary-700 pl-2 flex items-center space-x-2 text-sm leading-4">
                    {
                        selectedWallet && selectedSourceAccount?.address && <>
                            <div><Balance values={values} direction="from" /></div>
                            <div onClick={handleWalletChange} className="rounded-lg bg-secondary-500 flex space-x-1 items-center py-0.5 pl-2 pr-1 cursor-pointer">
                                <div className="inline-flex items-center relative p-0.5">
                                    <selectedWallet.icon className="w-5 h-5" />
                                </div>
                                <div className="text-primary-text">
                                    {shortenAddress(selectedSourceAccount.address)}
                                </div>
                                <div className="w-5 h-5 items-center flex">
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </div>
                            </div>
                        </>
                    }
                </div>
        }
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header={`Send from`}
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap id="item-1" className="space-y-3 pb-3">
                <WalletsList network={walletNetwork} purpose={'withdrawal'} onSelect={handleSelectWallet} token={source_token} />
                {
                    values.from?.deposit_methods.includes('deposit_address') &&
                    <div onClick={() => handleSelectWallet()} className="underline text-base text-center text-secondary-text cursor-pointer">
                        Continue without a wallet
                    </div>
                }
            </VaulDrawer.Snap >
        </VaulDrawer>
    </>
}

type WalletListProps = {
    network: Network,
    purpose: WalletPurpose,
    token: Token,
    onSelect: (wallet?: Wallet, address?: string) => void
}

export const FormSourceWalletButton: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const [mounted, setMounted] = useState<boolean>(false)

    const walletNetwork = values.fromExchange ? undefined : values.from

    const { wallets, provider } = useWallet(walletNetwork, 'withdrawal')

    const handleWalletChange = () => {
        setOpenModal(true)
    }
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSelectWallet = (wallet?: Wallet, address?: string) => {
        setFieldValue('source_wallet', wallet)
        setFieldValue('source_address', address)
        if (!wallet) {
            setFieldValue('depositMethod', 'deposit_address')
        }
        else {
            setFieldValue('depositMethod', 'wallet')
        }
        setOpenModal(false)
    }

    const connect = async () => {
        await provider?.connectWallet({ chain: walletNetwork?.chain_id || walletNetwork?.name })
    }

    if (!mounted || !walletNetwork || !values.fromCurrency) return null

    if (!provider?.connectedWallets?.length && walletNetwork) {
        return <button
            type='button'
            onClick={connect}
            className="w-full"
        >
            <Connect />
        </button>
    }
    else if (wallets.length > 0) {
        return <>
            <button type="button" className="w-full" onClick={handleWalletChange}>
                <Connect />
            </button>
            <VaulDrawer
                show={openModal}
                setShow={setOpenModal}
                header={`Send from`}
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1" className="space-y-3 pb-3">
                    <WalletsList network={walletNetwork} purpose={'withdrawal'} onSelect={handleSelectWallet} token={values.fromCurrency} />
                    {
                        values.from?.deposit_methods.includes('deposit_address') &&
                        <div onClick={() => handleSelectWallet()} className="underline text-base text-center text-secondary-text cursor-pointer">
                            Continue without a wallet
                        </div>
                    }
                </VaulDrawer.Snap>
            </VaulDrawer >
        </>
    }
    return <ConnectButton className="w-full">
        <Connect />
    </ConnectButton>

}

export const WalletsList: FC<WalletListProps> = ({ network, purpose, onSelect, token }) => {

    const { provider, wallets } = useWallet(network, purpose)
    const connectedWallets = network ? provider?.connectedWallets : wallets
    const { selectedSourceAccount } = useSwapDataState()
    const { balances, isBalanceLoading } = useBalancesState()

    const connect = async () => {
        await provider?.connectWallet({ chain: network.chain_id })
    }

    return (
        <div className="space-y-3">
            <button onClick={connect} type="button" className="w-full flex justify-center p-2 bg-secondary-700 rounded-md hover:bg-secondary-600">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </button>
            <div className="flex flex-col justify-start space-y-3">
                {
                    connectedWallets?.map((wallet) => (
                        wallet.addresses?.map((address, index) => {
                            const walletBalance = balances[address]?.find(b => b?.network === network?.name && b?.token === token?.symbol)
                            const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, token?.precision)

                            const isSelected = selectedSourceAccount?.address === address
                            return <div key={index} onClick={() => onSelect(wallet, address)} className="w-full cursor-pointer group/addressItem relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                                <AddressWithIcon
                                    addressItem={{ address: address, group: AddressGroup.ConnectedWallet }}
                                    connectedWallet={wallet}
                                    network={network}
                                    balance={(walletBalanceAmount !== undefined && token) ? { amount: walletBalanceAmount, symbol: token?.symbol, isLoading: isBalanceLoading } : undefined}
                                />
                                <div className="flex h-6 items-center px-1">
                                    {
                                        isSelected &&
                                        <FilledCheck />
                                    }
                                </div>
                            </div>
                        })
                    ))
                }
            </div>
        </div>
    )
}

const Connect: FC = () => {
    return <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-md transform hover:brightness-125 transition duration-200 ease-in-out bg-primary py-3 md:px-3 bg-primary/20 border-none !text-primary !px-4" >
        <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
            <WalletIcon className="h-6 w-6" strokeWidth="2" />
        </span>
        <span className="grow text-center">Connect a wallet</span>
    </div>
}


export default Component