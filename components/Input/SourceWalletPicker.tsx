import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useState } from "react";
import useWallet, { WalletPurpose } from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import { ChevronDown, Plus } from "lucide-react";
import Modal from "../modal/modal";
import { RouteNetwork } from "../../Models/Network";
import ConnectButton from "../buttons/connectButton";
import FilledCheck from "../icons/FilledCheck";
import { Wallet } from "../../stores/walletStore";
import SwapButton from "../buttons/swapButton";
import Balance from "./dynamic/Balance";
import AddressIcon from "../AddressIcon";
import { isValidAddress } from "../../lib/address/validator";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import VaulDrawer from "../modal/vaul";

const Component: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const { setSelectedSourceAccount } = useSwapDataUpdate()
    const { selectedSourceAccount } = useSwapDataState()
    const walletNetwork = values.fromExchange ? undefined : values.from

    const { provider, wallets } = useWallet(walletNetwork, 'asSource')

    const selectedWallet = selectedSourceAccount?.wallet
    const activeWallet = walletNetwork ? provider?.activeWallet : wallets[0]

    const source_addsress = selectedSourceAccount?.address

    useEffect(() => {
        if (source_addsress && walletNetwork && !isValidAddress(source_addsress, walletNetwork)) {
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
    }, [activeWallet, source_addsress, values.depositMethod])

    useEffect(() => {
        if (values.depositMethod === 'deposit_address' || !activeWallet?.address || (selectedSourceAccount && !wallets.some(w => w?.addresses?.some(a => a === selectedSourceAccount.address)))) {
            setSelectedSourceAccount(undefined)
        }
    }, [values.depositMethod, activeWallet?.address, wallets.length])

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = (wallet: Wallet | undefined, address: string | undefined) => {
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

    if (!walletNetwork)
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
            <VaulDrawer.Snap className="pb-3">
                <WalletsList route={walletNetwork} purpose={'autofil'} onSelect={handleSelectWallet} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    </>
}

type WalletListProps = {
    route?: RouteNetwork,
    purpose: WalletPurpose
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

    if (!mounted) return null

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
                <VaulDrawer.Snap className="pb-3">
                    <WalletsList route={walletNetwork} purpose={'autofil'} onSelect={handleSelectWallet} />
                </VaulDrawer.Snap>
            </VaulDrawer>
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

export const WalletsList: FC<WalletListProps> = ({ route, purpose, onSelect }) => {

    const { provider, wallets } = useWallet(route, purpose)
    const connectedWallets = route ? provider?.connectedWallets : wallets
    const { selectedSourceAccount } = useSwapDataState()

    return (
        <div className="space-y-3">
            <ConnectButton className="w-full flex justify-center p-2 bg-secondary-700 rounded-md hover:bg-secondary-600">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </ConnectButton>
            <div className="flex flex-col justify-start space-y-3">
                {
                    connectedWallets?.map((wallet) => {
                        return <>
                            {wallet.addresses?.map((address) => {
                                const isSelected = selectedSourceAccount?.address === address
                                return <div key={address} onClick={() => onSelect(wallet, address)} className="w-full cursor-pointer relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                                    <div className="flex space-x-4 items-center">
                                        <div className="flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9">
                                            <AddressIcon className="scale-150 h-9 w-9 p-0.5" address={address} size={36} />
                                        </div>
                                        <div>
                                            {
                                                !wallet.isLoading && wallet.address &&
                                                <p className="text-sm">{shortenAddress(address)}</p>
                                            }
                                            <div className="flex space-x-1">
                                                {
                                                    wallet.connector &&
                                                    <div className="inline-flex items-center relative">
                                                        <wallet.icon className="w-4 h-4 rounded-md bg-secondary-800" />
                                                    </div>
                                                }
                                                <p className="text-xs text-secondary-text">
                                                    {wallet.connector}
                                                </p>
                                            </div>

                                        </div>
                                    </div>
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
            <div onClick={() => onSelect()} className="underline text-base text-center text-secondary-text cursor-pointer">
                Continue without a wallet
            </div>
        </div>
    )
}


export default Component