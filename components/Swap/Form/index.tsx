import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettingsState } from "../../../context/settings";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { UpdateSwapInterface, useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import React from "react";
import ConnectNetwork from "../../ConnectNetwork";
import toast from "react-hot-toast";
import MainStepValidation from "../../../lib/mainStepValidator";
import { generateSwapInitialValues, generateSwapInitialValuesFromSwap } from "../../../lib/generateSwapInitialValues";
import LayerSwapApiClient from "../../../lib/apiClients/layerSwapApiClient";
import Modal from "../../modal/modal";
import SwapForm from "./Form";
import useSWR from "swr";
import { NextRouter, useRouter } from "next/router";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import { UpdateAuthInterface, UserType, useAuthDataUpdate } from "../../../context/authContext";
import { ApiError, LSAPIKnownErrorCode } from "../../../Models/ApiError";
import { useQueryState } from "../../../context/query";
import TokenService from "../../../lib/TokenService";
import LayerSwapAuthApiClient from "../../../lib/apiClients/userAuthApiClient";
import { AnimatePresence } from "framer-motion";
import { useQuote } from "../../../context/feeContext";
import ResizablePanel from "../../ResizablePanel";
import useWallet from "../../../hooks/useWallet";
import { DepositMethodProvider } from "../../../context/depositMethodContext";
import { dynamicWithRetries } from "../../../lib/dynamicWithRetries";
import AddressNote from "../../Input/Address/AddressNote";
import { addressFormat } from "../../../lib/address/formatter";
import { AddressGroup } from "../../Input/Address/AddressPicker";
import { useAddressesStore } from "../../../stores/addressesStore";
import { useAsyncModal } from "../../../context/asyncModal";
import { ValidationProvider } from "../../../context/validationErrorContext";
import { TrackEvent } from "../../../pages/_document";
import { PendingSwap } from "./PendingSwap";
import { QueryParams } from "@/Models/QueryParams";

type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}
const SwapDetails = dynamicWithRetries(() => import(".."),
    <div className="w-full h-[400px]">
        <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
                <div className="h-32 bg-secondary-500 rounded-lg"></div>
                <div className="h-40 bg-secondary-500 rounded-lg"></div>
                <div className="h-12 bg-secondary-500 rounded-lg"></div>
            </div>
        </div>
    </div>
)

export default function Form() {

    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const [showConnectNetworkModal, setShowConnectNetworkModal] = useState(false);
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [isAddressFromQueryConfirmed, setIsAddressFromQueryConfirmed] = useState(false);
    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const router = useRouter();
    const { updateAuthData, setUserType } = useAuthDataUpdate()
    const { getProvider } = useWallet()
    const addresses = useAddressesStore(state => state.addresses)
    const { getConfirmation } = useAsyncModal();

    const settings = useSettingsState();
    const query = useQueryState()
    const { createSwap, setSwapId, setSwapPath, removeSwapPath } = useSwapDataUpdate()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(query?.appName && `/internal/apps?name=${query?.appName}`, layerswapApiClient.fetcher)
    const partner = query?.appName && partnerData?.data?.client_id?.toLowerCase() === (query?.appName as string)?.toLowerCase() ? partnerData?.data : undefined

    const { swapResponse, selectedSourceAccount } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { minAllowedAmount, maxAllowedAmount, updatePolling: pollFee, mutateLimits } = useQuote()

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        const { destination_address, to } = values

        if (to &&
            destination_address &&
            (query.destAddress) &&
            (addressFormat(query.destAddress?.toString(), to) === addressFormat(destination_address, to)) &&
            !(addresses.find(a => addressFormat(a.address, to) === addressFormat(destination_address, to) && a.group !== AddressGroup.FromQuery)) && !isAddressFromQueryConfirmed) {

            const confirmed = await getConfirmation({
                content: <AddressNote partner={partner} values={values} />,
                submitText: 'Confirm address',
                dismissText: 'Cancel address'
            })

            if (confirmed) {
                setIsAddressFromQueryConfirmed(true)
            }
            else if (!confirmed) {
                return
            }
        }
        try {
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken) {
                try {
                    var apiClient = new LayerSwapAuthApiClient();
                    const res = await apiClient.guestConnectAsync()
                    updateAuthData(res)
                    setUserType(UserType.GuestUser)
                }
                catch (error) {
                    toast.error(error.response?.data?.error || error.message)
                    return;
                }
            }
            await handleCreateSwap({
                values,
                query,
                partner,
                router,
                minAllowedAmount,
                mutateLimits,
                setSwapId,
                setSwapPath,
                createSwap,
                setShowSwapModal: handleShowSwapModal,
                pollFee,
                updateAuthData,
                setUserType,
                setNetworkToConnect,
                setShowConnectNetworkModal
            })
        }
        catch (error) {
            toast.error(error?.message)
        }
    }, [createSwap, query, partner, router, updateAuthData, setUserType, swap, getProvider])

    const initialValues: SwapFormValues = swapResponse ? generateSwapInitialValuesFromSwap(swapResponse, settings)
        : generateSwapInitialValues(settings, query)

    useEffect(() => {
        formikRef.current?.validateForm();
    }, [minAllowedAmount, maxAllowedAmount, selectedSourceAccount]);

    const handleShowSwapModal = useCallback((value: boolean) => {
        pollFee(!value)
        setShowSwapModal(value)
        if (swap?.id) value ? setSwapPath(swap?.id, router) : removeSwapPath(router)
    }, [router, swap])

    const validator = useMemo(() => MainStepValidation({ minAllowedAmount, maxAllowedAmount, sourceAddress: selectedSourceAccount?.address, sameAccountNetwork: query.sameAccountNetwork }), [minAllowedAmount, maxAllowedAmount, selectedSourceAccount, query.sameAccountNetwork])

    return <DepositMethodProvider canRedirect onRedirect={() => handleShowSwapModal(false)}>
        <div className="rounded-r-lg cursor-pointer absolute z-10 md:mt-3 border-l-0">
            <AnimatePresence mode='wait'>
                {
                    swap &&
                    !showSwapModal &&
                    <PendingSwap key="pendingSwap" onClick={() => handleShowSwapModal(true)} />
                }
            </AnimatePresence>
        </div>
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
        <Modal height='fit'
            show={showSwapModal}
            setShow={handleShowSwapModal}
            header={`Complete the swap`}
            modalId="showSwap">
            <ResizablePanel>
                <SwapDetails type="contained" />
            </ResizablePanel>
        </Modal>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={validator}
            onSubmit={handleSubmit}
        >
            <ValidationProvider>
                <SwapForm partner={partner} />
            </ValidationProvider>
        </Formik>
    </DepositMethodProvider >
}

type SubmitProps = {
    values: SwapFormValues;
    query: QueryParams;
    partner?: Partner;
    router: NextRouter;
    minAllowedAmount?: number;
    setSwapId: UpdateSwapInterface['setSwapId'];
    setSwapPath: UpdateSwapInterface['setSwapPath'];
    createSwap: UpdateSwapInterface['createSwap'];
    setShowSwapModal: (value: boolean) => void;
    pollFee: (value: boolean) => void;
    updateAuthData: UpdateAuthInterface['updateAuthData'];
    setUserType: UpdateAuthInterface['setUserType'];
    setNetworkToConnect: (value: NetworkToConnect) => void;
    setShowConnectNetworkModal: (value: boolean) => void;
    mutateLimits: () => void;
}

const handleCreateSwap = async ({ query, values, partner, router, minAllowedAmount, setSwapId, setShowSwapModal, setSwapPath, pollFee, createSwap, setUserType, updateAuthData, setNetworkToConnect, setShowConnectNetworkModal, mutateLimits }: SubmitProps) => {
    if (values.depositMethod == 'wallet') {
        setSwapId(undefined)
        setShowSwapModal(true)
        return
    }

    try {
        const swapData = await createSwap(values, query, partner);
        const swapId = swapData?.swap?.id;
        plausible(TrackEvent.SwapInitiated)
        setSwapId(swapId)
        pollFee(false)
        setSwapPath(swapId, router)
        setShowSwapModal(true)
    }
    catch (error) {
        mutateLimits()
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
            const time = data.metadata.RemainingLimitPeriod?.split(':');
            const hours = Number(time[0])
            const minutes = Number(time[1])
            const remainingTime = `${hours > 0 ? `${hours.toFixed()} ${(hours > 1 ? 'hours' : 'hour')}` : ''} ${minutes > 0 ? `${minutes.toFixed()} ${(minutes > 1 ? 'minutes' : 'minute')}` : ''}`

            if (minAllowedAmount && data.metadata.AvailableTransactionAmount > minAllowedAmount) {
                throw new Error(`Daily limit of ${values.fromAsset?.symbol} transfers from ${values.from?.display_name} is reached. Please try sending up to ${data.metadata.AvailableTransactionAmount} ${values.fromAsset?.symbol} or retry in ${remainingTime}.`)
            } else {
                throw new Error(`Daily limit of ${values.fromAsset?.symbol} transfers from ${values.from?.display_name} is reached. Please retry in ${remainingTime}.`)
            }
        }
        else {
            throw new Error(data?.message || error?.message)
        }
    }
}