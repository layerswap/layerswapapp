import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useState } from "react";
import useWallet, { WalletPurpose } from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import { ChevronDown, Plus } from "lucide-react";
import { Network, Token } from "../../Models/Network";
import ConnectButton from "../buttons/connectButton";
import FilledCheck from "../icons/FilledCheck";
import { Wallet } from "../../stores/walletStore";
import SwapButton from "../buttons/swapButton";
import Balance from "./dynamic/Balance";
import { isValidAddress } from "../../lib/address/validator";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import VaulDrawer from "../modal/vaulModal";
import useBalance from "../../hooks/useBalance";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import AddressWithIcon from "./Address/AddressPicker/AddressWithIcon";
import { AddressGroup } from "./Address/AddressPicker";

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
    const { provider, wallets } = useWallet(walletNetwork, 'asSource')
    const { fetchBalance } = useBalance()

    const selectedWallet = selectedSourceAccount?.wallet
    const activeWallet = walletNetwork ? provider?.activeWallet : wallets[0]
    const source_addsress = selectedSourceAccount?.address
    const connectedWallets = provider?.connectedWallets

    useEffect(() => {

        if (source_addsress && walletNetwork && !isValidAddress(source_addsress, walletNetwork)) {
            const defaultValue = activeWallet?.addresses?.find(a => a === destination_address)
            if (defaultValue && isValidAddress(defaultValue, walletNetwork) && activeWallet) {
                setSelectedSourceAccount({
                    wallet: activeWallet,
                    address: defaultValue
                })
                return
            }

            setSelectedSourceAccount(undefined)
        }
    }, [source_addsress, walletNetwork])

    useEffect(() => {
        if (!source_addsress && activeWallet && values.depositMethod !== 'deposit_address') {
            setSelectedSourceAccount({
                wallet: activeWallet,
                address: activeWallet.address
            })
        }
    }, [activeWallet, source_addsress, values.depositMethod, destination_address])

    useEffect(() => {
        if (values.depositMethod === 'deposit_address' || !activeWallet?.address || (selectedSourceAccount && !wallets.some(w => w?.addresses?.some(a => a === selectedSourceAccount.address)))) {
            setSelectedSourceAccount(undefined)
        }
    }, [values.depositMethod, activeWallet?.address, wallets.length])

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
                <WalletsList network={walletNetwork} purpose={'autofil'} onSelect={handleSelectWallet} token={source_token} />
                <div onClick={() => handleSelectWallet()} className="underline text-base text-center text-secondary-text cursor-pointer">
                    Continue without a wallet
                </div>
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

    const { wallets } = useWallet(walletNetwork, 'asSource')

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

    if (!mounted || !walletNetwork || !values.fromCurrency) return null

    if (wallets.length > 0) {
        return <>
            <SwapButton
                className="plausible-event-name=Swap+initiated"
                type='button'
                isDisabled={false}
                isSubmitting={false}
                onClick={handleWalletChange}
            >
                Connect Wallet
            </SwapButton>
            <VaulDrawer
                show={openModal}
                setShow={setOpenModal}
                header={`Send from`}
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1" className="space-y-3 pb-3">
                    <WalletsList network={walletNetwork} purpose={'autofil'} onSelect={handleSelectWallet} token={values.fromCurrency} />
                    <div onClick={() => handleSelectWallet()} className="underline text-base text-center text-secondary-text cursor-pointer">
                        Continue without a wallet
                    </div>
                </VaulDrawer.Snap>
            </VaulDrawer >
        </>
    }
    return <ConnectButton className="w-full">
        <SwapButton
            className="plausible-event-name=Swap+initiated"
            type='button'
            isDisabled={false}
            isSubmitting={false}
        >
            Connect Wallet
        </SwapButton>
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
                    connectedWallets?.map((wallet) => {
                        return <>
                            {wallet.addresses?.map((address) => {
                                const walletBalance = balances[address]?.find(b => b?.network === network?.name && b?.token === token?.symbol)
                                const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, token?.precision)

                                const isSelected = selectedSourceAccount?.address === address
                                return <div key={address} onClick={() => onSelect(wallet, address)} className="w-full cursor-pointer group/addressItem relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
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
                            })}
                        </>
                    })
                }
            </div>
        </div>
    )
}


export default Component