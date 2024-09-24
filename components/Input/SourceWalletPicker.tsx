import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { FC, useEffect, useRef, useState } from "react";
import useWallet, { WalletPurpose } from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import Image from "next/image";
import { ChevronDown, Plus } from "lucide-react";
import Modal from "../modal/modal";
import { RouteNetwork } from "../../Models/Network";
import ConnectButton from "../buttons/connectButton";
import FilledCheck from "../icons/FilledCheck";
import { Wallet } from "../../stores/walletStore";
import SwapButton from "../buttons/swapButton";
import Balance from "./dynamic/Balance";
import AddressIcon from "../AddressIcon";

const Component: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const walletNetwork = values.fromExchange ? undefined : values.from

    const { provider } = useWallet(walletNetwork, 'asSource')

    const selectedWallet = values.source_wallet

    const connectedWalletAddress = provider?.activeWallet?.address
    const source_addsress = values.source_wallet?.address
    const previouslyAutofilledAddress = useRef<string | undefined>(undefined)

    useEffect(() => {
        if ((!source_addsress || (previouslyAutofilledAddress.current && previouslyAutofilledAddress.current != connectedWalletAddress)) && provider?.activeWallet && values.depositMethod !== 'deposit_address') {
            setFieldValue('source_wallet', provider?.activeWallet)
            setFieldValue('source_address', provider?.activeWallet?.address)
        }
    }, [provider?.activeWallet, source_addsress, values.depositMethod])

    useEffect(() => {
        if (values.depositMethod === 'deposit_address' || !provider?.activeWallet?.address) {
            setFieldValue('source_wallet', undefined)
            setFieldValue('source_address', undefined)
        }
    }, [values.depositMethod, provider?.activeWallet?.address])

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = (wallet: Wallet | undefined, address: string | undefined) => {
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
                        selectedWallet && values.source_address && <>
                            <div><Balance values={values} direction="from" /></div>
                            <div onClick={handleWalletChange} className="rounded-lg bg-secondary-500 flex space-x-1 items-center py-0.5 pl-2 pr-1 cursor-pointer">
                                <div className="inline-flex items-center relative p-0.5">
                                    <selectedWallet.icon className="w-5 h-5" />
                                </div>
                                <div className="text-primary-text">
                                    {shortenAddress(values.source_address)}
                                </div>
                                <div className="w-5 h-5 items-center flex">
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </div>
                            </div>
                        </>
                    }
                </div>
        }
        {<Modal
            height='fit'
            show={openModal}
            setShow={setOpenModal}
            header={`Send from`}
            modalId="connectedWallets"
        >
            <WalletsList route={walletNetwork} purpose={'autofil'} onSelect={handleSelectWallet} />
        </Modal>}
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

    const { wallets, provider } = useWallet(walletNetwork, 'asSource')

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
            {<Modal
                height='fit'
                show={openModal}
                setShow={setOpenModal}
                header={`Send from`}
                modalId="connectedWallets"
            >
                <WalletsList route={walletNetwork} purpose={'autofil'} onSelect={handleSelectWallet} />
            </Modal>}
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
    const {
        values,
    } = useFormikContext<SwapFormValues>();

    const { provider } = useWallet(route, purpose)

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
                    provider?.connectedWallets?.map((wallet) => {
                        return <>
                            {wallet.addresses?.map((address) => {
                                const isSelected = values.source_address === address

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
                        // return <div key={index} onClick={() => onSelect(wallet)} className="w-full cursor-pointer relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                        //     <div className="flex space-x-4 items-center">
                        //         {
                        //             wallet.connector &&
                        //             <div className="inline-flex items-center relative">
                        //                 <wallet.icon className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                        //             </div>
                        //         }
                        //         <div>
                        //             {
                        //                 !wallet.isLoading && wallet.address &&
                        //                 <p className="text-sm">{shortenAddress(wallet.address)}</p>
                        //             }
                        //             <p className="text-xs text-secondary-text">
                        //                 {wallet.connector}
                        //             </p>
                        //         </div>
                        //     </div>
                        //     <div className="flex h-6 items-center px-1">
                        //         {
                        //             isSelected &&
                        //             <FilledCheck />
                        //         }
                        //     </div>
                        // </div>
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