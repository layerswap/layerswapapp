import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsState } from "../../../context/settings";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import React from "react";
import ConnectNetwork from "../../ConnectNetwork";
import toast from "react-hot-toast";
import MainStepValidation from "../../../lib/mainStepValidator";
import { generateSwapInitialValues, generateSwapInitialValuesFromSwap } from "../../../lib/generateSwapInitialValues";
import LayerSwapApiClient, { SwapItem, TransactionType } from "../../../lib/layerSwapApiClient";
import Modal from "../../modal/modal";
import SwapForm from "./Form";
import { useRouter } from "next/router";
import useSWR from "swr";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import { UserType, useAuthDataUpdate } from "../../../context/authContext";
import { ApiError, KnownErrorCode } from "../../../Models/ApiError";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import { useQueryState } from "../../../context/query";
import { SwapStatus } from "../../../Models/SwapStatus";
import SwapDetails from "..";
import TokenService from "../../../lib/TokenService";
import LayerSwapAuthApiClient from "../../../lib/userAuthApiClient";

type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}

export default function Form() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const [showConnectNetworkModal, setShowConnectNetworkModal] = useState(false);
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const router = useRouter();
    const { updateAuthData, setUserType } = useAuthDataUpdate()

    const settings = useSettingsState();
    const query = useQueryState()
    const { createSwap, setSwapId } = useSwapDataUpdate()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(query?.addressSource && `/apps?name=${query?.addressSource}`, layerswapApiClient.fetcher)
    const partner = query?.addressSource && partnerData?.data?.name?.toLowerCase() === (query?.addressSource as string)?.toLowerCase() ? partnerData?.data : undefined

    const { swap } = useSwapDataState()

    useEffect(() => {
        if (swap) {
            const initialValues = generateSwapInitialValuesFromSwap(swap, settings)
            formikRef?.current?.resetForm({ values: initialValues })
            formikRef?.current?.validateForm(initialValues)
        }
    }, [swap])

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
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
            const swapId = await createSwap(values, query, partner);
            if (swapId) {
                setSwapId(swapId)
                var swapURL = window.location.protocol + "//"
                    + window.location.host + `/swap/${swapId}`;
                const params = resolvePersistantQueryParams(router.query)
                if (params) {
                    const search = new URLSearchParams(params as any);
                    swapURL += `?${search}`
                }
                window.history.pushState({ path: swapURL }, '', swapURL);
            }
            setShowSwapModal(true)
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (data?.code === KnownErrorCode.BLACKLISTED_ADDRESS) {
                toast.error("You can't transfer to that address. Please double check.")
            }
            else if (data?.code === KnownErrorCode.INVALID_ADDRESS_ERROR) {
                toast.error(`Enter a valid ${values.to?.display_name} address`)
            }
            else if (data?.code === KnownErrorCode.UNACTIVATED_ADDRESS_ERROR && values.to) {
                setNetworkToConnect({
                    DisplayName: values.to?.display_name,
                    AppURL: data.message
                })
                setShowConnectNetworkModal(true);
            }
            else {
                toast.error(error.message)
            }
        }
    }, [createSwap, query, partner, router, updateAuthData, setUserType, swap])

    const destAddress: string = query?.destAddress as string;

    const isPartnerAddress = partner && destAddress;

    const isPartnerWallet = isPartnerAddress && partner?.is_wallet;

    const initialValues: SwapFormValues = swap ? generateSwapInitialValuesFromSwap(swap, settings)
        : generateSwapInitialValues(settings, query)

    return <>
        <Modal height="fit" show={showConnectNetworkModal} setShow={setShowConnectNetworkModal} header={`${networkToConnect?.DisplayName} connect`}>
            {networkToConnect && <ConnectNetwork NetworkDisplayName={networkToConnect?.DisplayName} AppURL={networkToConnect?.AppURL} />}
        </Modal>
        <Modal height="90%" show={showSwapModal} setShow={setShowSwapModal} header={`Complete the swap`}>
            <SwapDetails type="contained" />
        </Modal>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation({ settings, query })}
            onSubmit={handleSubmit}
        >
            <SwapForm isPartnerWallet={!!isPartnerWallet} partner={partner} />
        </Formik>
    </>
}

export const shoudlCreateNewSwap = (swap: SwapItem | undefined, formValues: SwapFormValues) => {

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions") || "{}")?.[swap?.id || '']
    console.log("swapInputTransaction", swapInputTransaction)
    return !(swap &&
        !(swap.status !== SwapStatus.UserTransferPending
            || swapInputTransaction)
        && [swap.source_exchange, swap.source_network].includes(formValues.from?.internal_name)
        && [swap.destination_exchange, swap.destination_network].includes(formValues.to?.internal_name)
        && swap.source_network_asset === formValues.currency?.asset
        && swap.requested_amount === Number(formValues.amount)
        && swap.destination_address === formValues.destination_address)
}