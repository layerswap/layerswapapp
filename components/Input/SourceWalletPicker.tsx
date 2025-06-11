import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import useWallet from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import { ChevronDown, CircleHelp, QrCode } from "lucide-react";
import Balance from "./Amount/Balance";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import VaulDrawer, { WalletFooterPortal } from "../modal/vaulModal";
import { Wallet } from "../../Models/WalletProvider";
import WalletIcon from "../icons/WalletIcon";
import SubmitButton from "../buttons/submitButton";
import { useConnectModal } from "../WalletModal";
import WalletsList from "../Wallet/WalletsList";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import FilledCheck from "../icons/FilledCheck";
import clsx from "clsx";

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
    const { selectedConnector } = useConnectModal()
    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []

    const selectedWallet = selectedSourceAccount?.wallet
    //TODO: sort by active wallet
    const defaultWallet = walletNetwork && availableWallets?.find(w => !w.isNotAvailable)

    const source_addsress = selectedSourceAccount?.address

    useEffect(() => {
        if (!source_addsress && defaultWallet && values.depositMethod !== 'deposit_address') {
            setSelectedSourceAccount({
                wallet: defaultWallet,
                address: defaultWallet.address
            })
        }
    }, [defaultWallet?.address, source_addsress, values.depositMethod, destination_address])

    useEffect(() => {
        if (values.depositMethod === 'deposit_address' || !defaultWallet?.address || (selectedSourceAccount && !availableWallets.some(w => w?.addresses?.some(a => a === selectedSourceAccount.address)))) {
            setSelectedSourceAccount(undefined)
        }
    }, [values.depositMethod, defaultWallet?.address, availableWallets.length])

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
                            Manual Transfer
                        </div>
                        <div className="w-5 h-5 items-center flex">
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </div>
                    </div>
                </div>
                :
                <div className="rounded-lg bg-secondary-800 flex items-center space-x-2 text-sm leading-4">
                    {
                        selectedWallet && selectedSourceAccount?.address && <>
                            <Balance values={values} direction="from" />
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
            header='Send from'
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap
                id="item-1"
                className="pb-6 flex flex-col gap-3"
            >
                <div
                    className={clsx('w-full order-1', {
                        'order-3 space-y-2': values.depositMethod == 'deposit_address',
                    })}
                >
                    <WalletsList
                        provider={provider}
                        wallets={availableWallets}
                        onSelect={handleSelectWallet}
                        token={source_token}
                        network={walletNetwork}
                        selectable
                    />
                </div>
                {
                    values.from?.deposit_methods?.includes('deposit_address') && !selectedConnector &&
                    <>
                        <div className="flex items-center justify-center gap-2 text-secondary-text order-2">
                            <hr className="border-secondary-400 w-full" />
                            <p>
                                or
                            </p>
                            <hr className="border-secondary-400 w-full" />
                        </div>
                        <button
                            onClick={() => handleSelectWallet()}
                            className={clsx('w-full relative flex items-center justify-between gap-2 rounded-lg outline-none bg-secondary-700 p-3 py-4 text-secondary-text hover:bg-secondary-600 cursor-pointer order-1', {
                                'order-3': values.depositMethod !== 'deposit_address',
                            })}
                        >
                            <div className="flex items-center gap-2">
                                <QrCode className="w-5 h-5" />
                                <div className="text-base">
                                    Transfer Manually
                                </div>
                            </div>
                            {
                                values.depositMethod == 'deposit_address' &&
                                <div className="flex h-6 items-center px-1">
                                    <FilledCheck />
                                </div>
                            }
                        </button>
                    </>
                }
            </VaulDrawer.Snap >
        </VaulDrawer>
    </>
}

export const FormSourceWalletButton: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const { setSelectedSourceAccount } = useSwapDataUpdate()

    const [mountWalletPortal, setMounWalletPortal] = useState<boolean>(false)

    const walletNetwork = values.fromExchange ? undefined : values.from

    const { provider } = useWallet(walletNetwork, 'withdrawal')
    const { isWalletModalOpen, cancel, selectedConnector, connect } = useConnectModal()

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = (wallet?: Wallet, address?: string) => {
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
        cancel()
        setOpenModal(false)
    }

    const handleConnect = async () => {
        setMounWalletPortal(true)
        const result = await connect(provider)
        if (result) {
            handleSelectWallet(result, result.address)
        }
        setMounWalletPortal(false)
    }
    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []

    if (!availableWallets.length && walletNetwork) {
        return <>
            <Connect connectFn={handleConnect} />
            {
                mountWalletPortal && values.from?.deposit_methods?.includes('deposit_address') && values.depositMethod !== 'deposit_address' && !selectedConnector &&
                <WalletFooterPortal isWalletModalOpen={isWalletModalOpen}>
                    <ContinueWithoutWallet onClick={handleSelectWallet} />
                </WalletFooterPortal>
            }
        </>

    }
    else if (availableWallets.length > 0 && walletNetwork && values.fromCurrency) {
        return <>
            <div className="w-full" onClick={handleWalletChange}>
                <Connect />
            </div>
            <VaulDrawer
                show={openModal}
                setShow={setOpenModal}
                header={`Send from`}
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1" className="space-y-3 pb-3">
                    <WalletsList
                        provider={provider}
                        wallets={availableWallets}
                        onSelect={handleSelectWallet}
                        token={values.fromCurrency}
                        network={walletNetwork}
                        selectable
                    />
                </VaulDrawer.Snap>
            </VaulDrawer >
            {
                mountWalletPortal && values.from?.deposit_methods?.includes('deposit_address') && values.depositMethod !== 'deposit_address' && !selectedConnector &&
                <WalletFooterPortal isWalletModalOpen={isWalletModalOpen}>
                    <ContinueWithoutWallet onClick={handleSelectWallet} />
                </WalletFooterPortal>
            }
        </>
    }
    return <>
        <Connect setMountWalletPortal={setMounWalletPortal} />
        {
            mountWalletPortal && !selectedConnector &&
            <WalletFooterPortal isWalletModalOpen={isWalletModalOpen}>
                <ContinueWithoutWallet onClick={handleSelectWallet} />
            </WalletFooterPortal>
        }
    </>
}

const Connect: FC<{ connectFn?: () => Promise<Wallet | undefined | void>; setMountWalletPortal?: Dispatch<SetStateAction<boolean>> }> = ({ connectFn, setMountWalletPortal }) => {
    const { connect } = useConnectModal()

    const connectWallet = async () => {
        setMountWalletPortal && setMountWalletPortal(true)
        await connect()
        setMountWalletPortal && setMountWalletPortal(false)
    }

    return <SubmitButton onClick={() => connectFn ? connectFn() : connectWallet()} type="button" icon={<WalletIcon className="h-6 w-6" strokeWidth={2} />} >
        Connect a wallet
    </SubmitButton>
}

const ContinueWithoutWallet: FC<{ onClick: () => void }> = ({ onClick }) => {
    //TODO: bg-secondary-900 is a hotfix, should refactor and fix sticky footer for VaulDrawer
    return (
        <div className="inline-flex items-center gap-1.5 justify-center w-full pt-2 bg-secondary-900">
            <button onClick={onClick} className="underline hover:no-underline text-base text-center text-secondary-text cursor-pointer ">
                Continue without a wallet
            </button>
            <Popover>
                <PopoverTrigger>
                    <div className="text-xs text-secondary-text hover:text-primary-text rounded-full transition-colors duration-200 ">
                        <CircleHelp className="h-5 w-5" />
                    </div>
                </PopoverTrigger>
                <PopoverContent side="top" className="max-w-[250px] text-xs">
                    <p>Get a deposit address, send your crypto from any external wallet or exchange, and we&apos;ll handle the rest.</p>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default Component