import { useFormikContext } from "formik";
import { FC, useCallback, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useProvidersConnectReady } from "@layerswap/wallet-core";
import { ChevronDown } from "lucide-react";
import VaulDrawer from "@/components/Modal/vaulModal";
import { SelectAccountProps } from "@layerswap/wallet-core/types";
import { WalletIcon } from "@layerswap/ui-kit/components";
import WalletIconView from "@/components/Wallet/WalletIconView";
import SubmitButton from "@/components/Buttons/submitButton";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import WalletsList from "@/components/Wallet/WalletComponents/WalletsList";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import { useNamedAddress } from "@/stores/addressBookStore";

import ManualTransferOption from "./ManualTransferOption";
import { useInitialSettings } from "@/context/settings";
import { manualTransferAvailable } from "@/helpers/manualTransferAvailable";

type SourceWalletPickerProps = {
    hideManualTransfer?: boolean;
}

const SourceWalletPicker: FC<SourceWalletPickerProps> = ({ hideManualTransfer }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const initialSettings = useInitialSettings();
    const canTransferManually = !hideManualTransfer && manualTransferAvailable(values, initialSettings);
    const manualMethodLocked = initialSettings.hideDepositMethod && initialSettings.depositMethod === 'deposit_address';
    const source_token = values.fromAsset
    const selectSourceAccount = useSelectSwapAccount("from");

    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const sourceLabel = useNamedAddress(selectedSourceAccount?.address, values.from)

    const { selectedConnector, selectedMultiChainConnector } = useConnectModal()
    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = useCallback((props?: SelectAccountProps) => {
        if (props) {
            selectSourceAccount({
                id: props.walletId,
                address: props.address,
                providerName: props.providerName
            })
            setFieldValue('depositMethod', 'wallet')
        }
        else {
            setFieldValue('depositMethod', 'deposit_address')
        }
        setOpenModal(false)
    }, [provider, setFieldValue, selectSourceAccount])

    if (!values.from || !source_token)
        return <></>

    return <>
        <span>
            {
                values.depositMethod === 'deposit_address' ?
                    (
                        provider && !manualMethodLocked
                            ? <button type="button" onClick={handleWalletChange} className="flex items-center space-x-2 text-sm rounded-lg hover:bg-secondary-400 py-1 pl-2 pr-1 outline-hidden">
                                <div className="flex space-x-1 items-center">
                                    <div className="text-secondary-text">
                                        Manual Transfer
                                    </div>
                                    <div className="w-5 h-5 items-center flex text-secondary-text">
                                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                    </div>
                                </div>
                            </button>
                            : <div className="text-secondary-text text-sm  rounded-lg hover:bg-secondary-400 py-1 pl-2 pr-1">
                                Manual Transfer
                            </div>
                    )
                    :
                    selectedSourceAccount && selectedSourceAccount?.address &&
                    <button type="button" onClick={handleWalletChange} className="rounded-lg flex items-center space-x-2 text-sm hover:bg-secondary-400 py-1 pl-2 pr-2 outline-hidden">
                        <div className="rounded-lg flex space-x-1 items-center">
                            <div className="inline-flex items-center relative px-0.5">
                                <WalletIconView wallet={selectedSourceAccount} className="w-4 h-4" size={16} />
                            </div>
                            <div className="text-secondary-text truncate max-w-[90px]">{sourceLabel}</div>
                            <div className="w-4 h-4 items-center flex text-secondary-text">
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </div>
                        </div>
                    </button>
            }
        </span>
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header='Select swap method'
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap
                id="item-1"
                className="pb-4 flex flex-col gap-3"
            >
                <div className="w-full">
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
                {canTransferManually && !selectedConnector && !selectedMultiChainConnector ? (
                    <ManualTransferOption
                        onSelect={() => handleSelectWallet()}
                        selected={values.depositMethod === 'deposit_address'}
                    />
                ) : null}
            </VaulDrawer.Snap >
        </VaulDrawer>
    </>
}

export const FormSourceWalletButton: FC<{ isDisabled?: boolean }> = ({ isDisabled }) => {
    const [openModal, setOpenModal] = useState(false);
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const initialSettings = useInitialSettings();
    const walletNetwork = values.fromExchange ? undefined : values.from;
    const { provider } = useWallet(walletNetwork, 'withdrawal');
    const { cancel, connect } = useConnectModal();
    const providersReady = useProvidersConnectReady();
    const selectSourceAccount = useSelectSwapAccount("from");
    const canTransferManually = manualTransferAvailable(values, initialSettings);
    const availableWallets = provider?.connectedWallets?.filter(wallet => !wallet.isNotAvailable) || [];
    const actionLabel = canTransferManually ? 'Select swap method' : 'Connect a wallet';

    const handleSelectWallet = (account: SelectAccountProps) => {
        selectSourceAccount({
            address: account.address,
            id: account.walletId,
            providerName: account.providerName,
        });
        setFieldValue('depositMethod', 'wallet');
        setOpenModal(false);
    };

    const handleManualTransfer = () => {
        setFieldValue('depositMethod', 'deposit_address');
        cancel();
        setOpenModal(false);
    };

    const handleOpen = async () => {
        if (availableWallets.length && walletNetwork && values.fromAsset) {
            setOpenModal(true);
            return;
        }
        const result = await connect(provider, {
            title: canTransferManually ? 'Select swap method' : undefined,
            bottomContent: canTransferManually ? <ManualTransferOption onSelect={handleManualTransfer} className="shrink-0" /> : undefined,
        });
        if (result && (!walletNetwork || result.withdrawalSupportedNetworks?.includes(walletNetwork.name))) {
            handleSelectWallet({ address: result.address, walletId: result.id, providerName: result.providerName });
        }
    };

    return <>
        <SubmitButton
            onClick={handleOpen}
            type="button"
            data-attr="connect-wallet"
            data-ls-action="select_swap_method"
            icon={<WalletIcon className="h-6 w-6" strokeWidth={2} />}
            isDisabled={isDisabled || (!canTransferManually && !providersReady)}
        >
            {actionLabel}
        </SubmitButton>
        <VaulDrawer show={openModal} setShow={setOpenModal} header={actionLabel} modalId="connectedWallets">
            <VaulDrawer.Snap id="item-1" className="space-y-3 pb-3">
                <WalletsList
                    provider={provider}
                    wallets={availableWallets}
                    onSelect={handleSelectWallet}
                    token={values.fromAsset}
                    network={walletNetwork}
                    selectedDepositMethod={values.depositMethod}
                    selectable
                />
                {canTransferManually ? <ManualTransferOption onSelect={handleManualTransfer} /> : null}
            </VaulDrawer.Snap>
        </VaulDrawer>
    </>;
};

export default SourceWalletPicker;
