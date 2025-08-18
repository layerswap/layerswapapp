import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Dispatch, FC, SetStateAction, useCallback, useMemo, useState } from "react";
import useWallet from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import { ChevronDown, CircleHelp, QrCode } from "lucide-react";
import VaulDrawer, { WalletFooterPortal } from "../modal/vaulModal";
import { SelectAccountProps, Wallet } from "../../Models/WalletProvider";
import WalletIcon from "../icons/WalletIcon";
import SubmitButton from "../buttons/submitButton";
import { useConnectModal } from "../WalletModal";
import WalletsList from "../Wallet/WalletsList";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import FilledCheck from "../icons/FilledCheck";
import clsx from "clsx";
import { SwitchWalletAccount } from "@/helpers/accountSelectHelper";

const SourceWalletPicker: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const source_token = values.fromAsset

    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    const { selectedConnector } = useConnectModal()
    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []


    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = useCallback((props?: SelectAccountProps) => {
        if (props) {
            SwitchWalletAccount(props, provider)
            setFieldValue('depositMethod', 'wallet')
        }
        else {
            setFieldValue('depositMethod', 'deposit_address')
        }
        setOpenModal(false)
    }, [provider, setFieldValue])

    if (!values.from || !source_token)
        return <></>

    return <>
        {
            values.depositMethod === 'deposit_address' ?
                (
                    provider
                        ? <div className="flex items-center space-x-2 text-sm">
                            <div onClick={handleWalletChange} className="flex space-x-1 items-center cursor-pointer">
                                <div className="text-secondary-text">
                                    Manual Transfer
                                </div>
                                <div className="w-5 h-5 items-center flex">
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </div>
                            </div>
                        </div>
                        : <div className="text-secondary-text text-sm">
                            Manual Transfer
                        </div>
                )
                :
                <div className="rounded-lg flex items-center space-x-2 text-sm">
                    {
                        selectedSourceAccount && selectedSourceAccount?.address && <>
                            <div onClick={handleWalletChange} className="rounded-lg flex space-x-1 items-center cursor-pointer">
                                <div className="inline-flex items-center relative px-0.5">
                                    <selectedSourceAccount.icon className="w-4 h-4" />
                                </div>
                                <div className="text-secondary-text">
                                    {shortenAddress(selectedSourceAccount.address)}
                                </div>
                                <div className="w-4 h-4 items-center flex text-primary-text">
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
                className="pb-4 flex flex-col gap-3"
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
                        network={values.from}
                        selectedDepositMethod={values.depositMethod}
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
                            type="button"
                            onClick={() => handleSelectWallet()}
                            className={clsx('w-full relative flex items-center justify-between gap-2 rounded-lg outline-none bg-secondary-500 p-3 py-4 text-secondary-text hover:bg-secondary-400 cursor-pointer order-1', {
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

    const [mountWalletPortal, setMounWalletPortal] = useState<boolean>(false)

    const walletNetwork = values.fromExchange ? undefined : values.from

    const { provider } = useWallet(walletNetwork, 'withdrawal')

    const { isWalletModalOpen, cancel, selectedConnector, connect } = useConnectModal()

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = (props?: SelectAccountProps) => {
        if (props) {
            SwitchWalletAccount(props, provider)
            setFieldValue('depositMethod', 'wallet')
        }
        else {
            setFieldValue('depositMethod', 'deposit_address')
        }
        cancel()
        setOpenModal(false)
    }

    const handleConnect = async () => {
        setMounWalletPortal(true)
        const result = await connect(provider)
        if (result) {
            SwitchWalletAccount({
                walletId: result.id,
                address: result.address,
                providerName: result.providerName
            }, provider)
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
    else if (availableWallets.length > 0 && walletNetwork && values.fromAsset) {
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
                        token={values.fromAsset}
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
    //TODO: bg-secondary-700 is a hotfix, should refactor and fix sticky footer for VaulDrawer
    return (
        <div className="inline-flex items-center gap-1.5 justify-center w-full pt-2 bg-secondary-700">
            <button type="button" onClick={onClick} className="underline hover:no-underline text-base text-center text-secondary-text cursor-pointer ">
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

export default SourceWalletPicker