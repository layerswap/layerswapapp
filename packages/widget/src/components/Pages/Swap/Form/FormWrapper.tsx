import { Formik, FormikProps } from "formik";
import { useCallback, useRef, useState } from "react";
import { useSettingsState } from "@/context/settings";
import { UpdateSwapInterface, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import React from "react";
import ConnectNetwork from "@/components/Pages/Swap/Form/SecondaryComponents/ConnectNetwork";
import toast from "react-hot-toast";
import { generateSwapInitialValues, generateSwapInitialValuesFromSwap } from "@/lib/generateSwapInitialValues";
import { Partner } from "@/Models/Partner";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { useInitialSettings } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { useAsyncModal } from "@/context/asyncModal";
import { InitialSettings } from "@/Models/InitialSettings";
import VaulDrawer from "@/components/Modal/vaulModal";
import { useBalance } from "@/lib/balances/useBalance";
import { useSelectedAccount } from "@/context/swapAccounts";
import SwapDetails from "../Withdraw/SwapDetails";
import { SwapFormValues } from "./SwapFormValues";
import { useCallbacks } from "@/context/callbackProvider";
import ContractAddressNote from "@/components/Input/Address/ContractAddressNote";
import { useContractAddressStore } from "@/stores/contractAddressStore";
import UrlAddressNote from "@/components/Input/Address/UrlAddressNote";
import { Address } from "@/lib/address/Address";

type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}

export default function FormWrapper({ children, type, partner }: { children?: React.ReactNode, type: 'cross-chain' | 'exchange', partner?: Partner }) {

    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const [showConnectNetworkModal, setShowConnectNetworkModal] = useState(false);
    const [isAddressFromQueryConfirmed, setIsAddressFromQueryConfirmed] = useState(false);
    const dontShowContractWarningRef = useRef(false);

    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const settings = useSettingsState();
    const { swapBasicData, swapDetails, swapModalOpen } = useSwapDataState()
    const sourceNetworkWithTokens = settings.networks.find(n => n.name === swapBasicData?.source_network.name)
    const { getProvider } = useWallet(sourceNetworkWithTokens, "withdrawal")
    const [walletWihdrawDone, setWalletWihdrawDone] = useState(false);
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData?.source_network?.name);
    const { mutate: mutateBalances } = useBalance(selectedSourceAccount?.address, sourceNetworkWithTokens)
    const { onSwapModalStateChange } = useCallbacks()
    const { getConfirmation } = useAsyncModal();
    const initialSettings = useInitialSettings()
    const { destination_address: destinationAddressFromQuery } = initialSettings
    const { createSwap, setSwapId, setSubmitedFormValues, setSwapModalOpen } = useSwapDataUpdate()
    const { setSwapError } = useSwapDataState()

    const { setConfirmed, isConfirmed, checkContractStatus } = useContractAddressStore();

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        setSwapError && setSwapError('')
        const { destination_address, to } = values
        setWalletWihdrawDone(false)
        if (!walletWihdrawDone) {
            setWalletWihdrawDone(false)
        }

        if (
            to &&
            destination_address &&
            destinationAddressFromQuery &&
            Address.equals(destinationAddressFromQuery?.toString(), destination_address, to) &&
            !isAddressFromQueryConfirmed
        ) {
            const provider = to && getProvider(to, 'autofill')
            const isDestAddressConnected = destination_address && provider?.connectedWallets?.some((wallet) => Address.equals(wallet.address, destination_address, to))

            const confirmed = !isDestAddressConnected ? await getConfirmation({
                content: <UrlAddressNote partner={partner} values={values} />,
                submitText: 'Confirm address',
                dismissText: 'Cancel address'
            }) : true

            if (confirmed) {
                setIsAddressFromQueryConfirmed(true)
            }
            else if (!confirmed) {
                return;
            }
        }

        if (destination_address && values.from && values.to && values.to.type === 'evm') {
            const alreadyConfirmed = isConfirmed(destination_address, values.to.name);

            if (!alreadyConfirmed) {
                const { isContractInAnyNetwork, destinationIsContract } = await checkContractStatus(destination_address, values.from, values.to);
                if (isContractInAnyNetwork && !destinationIsContract) {
                    dontShowContractWarningRef.current = false;

                    const handleDontShowAgainChange = (checked: boolean) => {
                        dontShowContractWarningRef.current = checked;
                    };

                    const confirmed = await getConfirmation({
                        content: <ContractAddressNote values={values} onDontShowAgainChange={handleDontShowAgainChange} />,
                        submitText: 'Confirm',
                        dismissText: 'Cancel'
                    });

                    if (confirmed && dontShowContractWarningRef.current) {
                        setConfirmed(destination_address, values.to.name);
                    } else if (!confirmed) {
                        return;
                    }
                }
            }
        }

        try {
            await handleCreateSwap({
                setSwapId,
                values,
                setSubmitedFormValues,
                query: initialSettings,
                partner,
                createSwap: async (...props) => {
                    const response = await createSwap(...props)
                    return response
                },
                setShowSwapModal: handleShowSwapModal,
                setNetworkToConnect,
                setShowConnectNetworkModal,
            })
        }
        catch (error) {
            toast.error(error?.message)
        }
    }, [createSwap, initialSettings, partner, swapBasicData, getProvider, settings])

    const initialValues: SwapFormValues = swapBasicData ? generateSwapInitialValuesFromSwap(swapBasicData, swapBasicData.refuel, settings, type)
        : generateSwapInitialValues(settings, initialSettings, type)

    const handleShowSwapModal = useCallback((value: boolean) => {
        setSwapModalOpen(value)
        onSwapModalStateChange(value)
        if (!value) {
            if (walletWihdrawDone) {
                mutateBalances()
                setWalletWihdrawDone(false)
                formikRef?.current?.setFieldValue('amount', 0, true);
            }
        }
    }, [swapDetails, walletWihdrawDone, mutateBalances])

    const handleWalletWithdrawalSuccess = useCallback(() => {
        setWalletWihdrawDone(true)
    }, []);

    return <>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            onSubmit={handleSubmit}
        >
            <>
                <VaulDrawer
                    show={showConnectNetworkModal}
                    setShow={setShowConnectNetworkModal}
                    header={`${networkToConnect?.DisplayName} connect`}
                    modalId="showNetwork"
                >
                    <VaulDrawer.Snap id="item-1">
                        {
                            networkToConnect &&
                            <ConnectNetwork NetworkDisplayName={networkToConnect?.DisplayName} AppURL={networkToConnect?.AppURL} />
                        }
                    </VaulDrawer.Snap>
                </VaulDrawer>
                <VaulDrawer
                    mode="fitHeight"
                    show={swapModalOpen}
                    setShow={handleShowSwapModal}
                    header='Complete the swap'
                    modalId="showSwap"
                    className="expandContainerHeight">
                    <SwapDetails type="contained" onWalletWithdrawalSuccess={handleWalletWithdrawalSuccess} partner={partner} onCancelWithdrawal={() => handleShowSwapModal(false)} />
                </VaulDrawer>
                {children}
            </>
        </Formik>
    </>
}

type SubmitProps = {
    values: SwapFormValues;
    query: InitialSettings;
    partner?: Partner;
    setSubmitedFormValues: UpdateSwapInterface['setSubmitedFormValues'];
    setSwapId: UpdateSwapInterface['setSwapId'];

    createSwap: UpdateSwapInterface['createSwap'];
    setShowSwapModal: (value: boolean) => void;
    setNetworkToConnect: (value: NetworkToConnect) => void;
    setShowConnectNetworkModal: (value: boolean) => void;
}

const handleCreateSwap = async ({ query, values, partner, setShowSwapModal, createSwap, setNetworkToConnect, setShowConnectNetworkModal, setSwapId, setSubmitedFormValues }: SubmitProps) => {
    setSubmitedFormValues(values)
    if (values.depositMethod == 'wallet') {
        setSwapId(undefined)
        setShowSwapModal(true)
        return
    }
    try {
        const swap = await createSwap(values, query, partner);
        setSwapId(swap.swap.id)
        setShowSwapModal(true)
    }
    catch (error) {
        const data: ApiError = error?.response?.data?.error
        if (data?.code === LSAPIKnownErrorCode.BLACKLISTED_ADDRESS) {
            throw new Error("You can't transfer to that address. Please double check.")
        }
        else if (data?.code === LSAPIKnownErrorCode.INVALID_ADDRESS_ERROR) {
            throw new Error(`Enter a valid ${values.to?.display_name} address`)
        }
        else if (data?.code === LSAPIKnownErrorCode.UNACTIVATED_ADDRESS_ERROR && values.to) {
            setNetworkToConnect({
                DisplayName: values.to.display_name,
                AppURL: data.metadata.ActivationUrl
            })
            setShowConnectNetworkModal(true);
        } else if (data?.code === LSAPIKnownErrorCode.NETWORK_CURRENCY_DAILY_LIMIT_REACHED) {
            if (data.metadata.AvailableTransactionAmount) {
                throw new Error(`Daily limit of ${values.fromAsset?.symbol} transfers from ${values.from?.display_name} is reached. Please try sending up to ${data.metadata.AvailableTransactionAmount} ${values.fromAsset?.symbol}.`)
            } else {
                throw new Error(`Daily limit of ${values.fromAsset?.symbol} transfers from ${values.from?.display_name} is reached.`)
            }
        }
        else {
            throw new Error(data?.message || error?.message)
        }
    }
}