import { Formik } from "formik";
import { useCallback, useRef, useState } from "react";
import { useSettingsState } from "@/context/settings";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { removeSwapPath, UpdateSwapInterface, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import React from "react";
import ConnectNetwork from "@/components/ConnectNetwork";
import toast from "react-hot-toast";
import { generateSwapInitialValues, generateSwapInitialValuesFromSwap } from "@/lib/generateSwapInitialValues";
import Modal from "@/components/modal/modal";
import { useRouter } from "next/router";
import { Partner } from "@/Models/Partner";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { useQueryState } from "@/context/query";
import useWallet from "@/hooks/useWallet";
import { useAsyncModal } from "@/context/asyncModal";
import { QueryParams } from "@/Models/QueryParams";
import VaulDrawer from "@/components/modal/vaulModal";
import { Address } from "@/lib/address";
import UrlAddressNote from "@/components/Input/Address/UrlAddressNote";
import { useSelectedAccount } from "@/context/swapAccounts";
import SwapDetails from "..";
import { useBalance } from "@/lib/balances/useBalance";
import ContractAddressNote from "@/components/Input/Address/ContractAddressNote";
import { useContractAddressStore } from "@/stores/contractAddressStore";

type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}

export default function FormWrapper({ children, type, partner }: { children?: React.ReactNode, type: 'cross-chain' | 'exchange', partner?: Partner }) {

    const [showConnectNetworkModal, setShowConnectNetworkModal] = useState(false);
    const [isAddressFromQueryConfirmed, setIsAddressFromQueryConfirmed] = useState(false);
    const dontShowContractWarningRef = useRef(false);

    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const router = useRouter();
    const settings = useSettingsState();
    const { swapBasicData, swapDetails, swapModalOpen } = useSwapDataState()
    const sourceNetworkWithTokens = settings.networks.find(n => n.name === swapBasicData?.source_network.name)
    const { getProvider } = useWallet(sourceNetworkWithTokens, "withdrawal")
    const [walletWihdrawDone, setWalletWihdrawDone] = useState(false);
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData?.source_network?.name);
    const { mutate: mutateBalances } = useBalance(selectedSourceAccount?.address, sourceNetworkWithTokens)

    const { getConfirmation } = useAsyncModal();
    const query = useQueryState()
    const { destination_address: destinationAddressFromQuery } = query
    const { createSwap, setSwapId, setSubmitedFormValues, setSwapModalOpen } = useSwapDataUpdate()
    const { setSwapError } = useSwapDataState()

    const { setConfirmed, isConfirmed, checkContractStatus } = useContractAddressStore();

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        setSwapError && setSwapError('')
        const { destination_address } = values
        const to = values.destination?.network
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

        if (destination_address && values.source?.network && values.destination?.network && values.destination.network.type === 'evm') {
            const alreadyConfirmed = isConfirmed(destination_address, values.destination.network.name);

            if (!alreadyConfirmed) {
                const { isContractInAnyNetwork, destinationIsContract } = await checkContractStatus(destination_address, values.source.network, values.destination.network);
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

                    if (confirmed && dontShowContractWarningRef.current && values.destination?.network) {
                        setConfirmed(destination_address, values.destination.network.name);
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
                query,
                partner,
                createSwap,
                setShowSwapModal: handleShowSwapModal,
                setNetworkToConnect,
                setShowConnectNetworkModal,
            })
        }
        catch (error) {
            toast.error(error?.message)
        }
    }, [createSwap, query, partner, router, swapBasicData, getProvider, settings])

    const initialValues: SwapFormValues = swapBasicData ? generateSwapInitialValuesFromSwap(swapBasicData, swapBasicData.refuel, settings, type)
        : generateSwapInitialValues(settings, query, type)

    const handleShowSwapModal = useCallback((value: boolean) => {
        if (!value) {
            setSwapId(undefined)
            removeSwapPath(router)
            if (walletWihdrawDone) {
                mutateBalances()
                setWalletWihdrawDone(false)
            }
        }
        setSwapModalOpen(value)
    }, [router, swapDetails, walletWihdrawDone, mutateBalances])


    return <>
        <Formik
            initialValues={initialValues}
            validateOnMount={true}
            onSubmit={handleSubmit}
        >
            {({ setFieldValue }) => (
                <>
                    <Modal
                        height="fit"
                        show={showConnectNetworkModal}
                        setShow={setShowConnectNetworkModal}
                        header={`${networkToConnect?.DisplayName} connect`}
                        modalId="showNetwork"
                    >
                        {
                            networkToConnect &&
                            <ConnectNetwork NetworkDisplayName={networkToConnect?.DisplayName} AppURL={networkToConnect?.AppURL} />
                        }
                    </Modal>
                    <VaulDrawer
                        mode="fitHeight"
                        show={swapModalOpen}
                        setShow={handleShowSwapModal}
                        header='Complete the swap'
                        modalId="showSwap"
                        className="expandContainerHeight">
                        <SwapDetails type="contained" onWalletWithdrawalSuccess={() => {
                            setWalletWihdrawDone(true)
                            setFieldValue('amount', 0)
                            mutateBalances()
                        }} partner={partner} onCancelWithdrawal={() => handleShowSwapModal(false)} />
                    </VaulDrawer>
                    {children}
                </>
            )}
        </Formik>
    </>
}

type SubmitProps = {
    values: SwapFormValues;
    query: QueryParams;
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
            throw new Error(`Enter a valid ${values.destination?.network?.display_name} address`)
        }
        else if (data?.code === LSAPIKnownErrorCode.UNACTIVATED_ADDRESS_ERROR && values.destination?.network) {
            setNetworkToConnect({
                DisplayName: values.destination.network.display_name,
                AppURL: data.metadata.ActivationUrl
            })
            setShowConnectNetworkModal(true);
        } else if (data?.code === LSAPIKnownErrorCode.NETWORK_CURRENCY_DAILY_LIMIT_REACHED) {
            const sourceTokenSymbol = values.source?.token?.symbol
            const sourceNetworkName = values.source?.network?.display_name
            if (data.metadata.AvailableTransactionAmount) {
                throw new Error(`Daily limit of ${sourceTokenSymbol} transfers from ${sourceNetworkName} is reached. Please try sending up to ${data.metadata.AvailableTransactionAmount} ${sourceTokenSymbol}.`)
            } else {
                throw new Error(`Daily limit of ${sourceTokenSymbol} transfers from ${sourceNetworkName} is reached.`)
            }
        }
        else {
            throw new Error(data?.message || error?.message)
        }
    }
}