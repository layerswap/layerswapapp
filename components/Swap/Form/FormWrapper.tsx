import { Formik, FormikProps } from "formik";
import { useCallback, useRef, useState } from "react";
import { useSettingsState } from "@/context/settings";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { removeSwapPath, UpdateSwapInterface, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import React from "react";
import ConnectNetwork from "@/components/ConnectNetwork";
import toast from "react-hot-toast";
import { generateSwapInitialValues, generateSwapInitialValuesFromSwap } from "@/lib/generateSwapInitialValues";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import Modal from "@/components/modal/modal";
import useSWR from "swr";
import { useRouter } from "next/router";
import { ApiResponse } from "@/Models/ApiResponse";
import { Partner } from "@/Models/Partner";
import { UserType, useAuthDataUpdate } from "@/context/authContext";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { useQueryState } from "@/context/query";
import TokenService from "@/lib/TokenService";
import LayerSwapAuthApiClient from "@/lib/apiClients/userAuthApiClient";
import useWallet from "@/hooks/useWallet";
import { DepositMethodProvider } from "@/context/depositMethodContext";
import { dynamicWithRetries } from "@/lib/dynamicWithRetries";
import { useAsyncModal } from "@/context/asyncModal";
import { QueryParams } from "@/Models/QueryParams";
import VaulDrawer from "@/components/modal/vaulModal";
import { addressFormat } from "@/lib/address/formatter";
import AddressNote from "@/components/Input/Address/AddressNote";

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

export default function FormWrapper({ children, type }: { children?: React.ReactNode, type: 'cross-chain' | 'exchange' }) {

    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const [showConnectNetworkModal, setShowConnectNetworkModal] = useState(false);
    const [isAddressFromQueryConfirmed, setIsAddressFromQueryConfirmed] = useState(false);
    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const router = useRouter();
    const { updateAuthData, setUserType } = useAuthDataUpdate()
    const settings = useSettingsState();
    const { swapBasicData, swapDetails, swapModalOpen } = useSwapDataState()
    const sourceNetworkWithTokens = settings.networks.find(n => n.name === swapBasicData?.source_network.name)
    const { getProvider } = useWallet(sourceNetworkWithTokens, "withdrawal")

    const { getConfirmation } = useAsyncModal();

    const query = useQueryState()
    const { appName, destination_address: destinationAddressFromQuery } = query
    const { createSwap, setSwapId, setSubmitedFormValues, setSwapModalOpen } = useSwapDataUpdate()



    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = appName && partnerData?.data?.client_id?.toLowerCase() === (appName as string)?.toLowerCase() ? partnerData?.data : undefined

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        const { destination_address, to } = values

        if (
            to &&
            destination_address &&
            destinationAddressFromQuery &&
            (addressFormat(destinationAddressFromQuery?.toString(), to) === addressFormat(destination_address, to)) &&
            !isAddressFromQueryConfirmed
        ) {
            const provider = to && getProvider(to, 'autofil')
            const isDestAddressConnected = destination_address && provider?.connectedWallets?.some((wallet) => addressFormat(wallet.address, to) === addressFormat(destination_address, to))

            const confirmed = !isDestAddressConnected ? await getConfirmation({
                content: <AddressNote partner={partner} values={values} />,
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
    }, [createSwap, query, partner, router, updateAuthData, setUserType, swapBasicData, getProvider, settings])

    const initialValues: SwapFormValues = swapBasicData ? generateSwapInitialValuesFromSwap(swapBasicData, swapBasicData.refuel, settings, type)
        : generateSwapInitialValues(settings, query, type)

    const handleShowSwapModal = useCallback((value: boolean) => {
        setSwapModalOpen(value)
        if (!value)
            removeSwapPath(router)
    }, [router, swapDetails])

    return <>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            onSubmit={handleSubmit}
        >
            <DepositMethodProvider canRedirect onRedirect={() => handleShowSwapModal(false)}>
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
                    show={swapModalOpen}
                    setShow={handleShowSwapModal}
                    header={`Complete the swap`}
                    modalId="showSwap">
                    <VaulDrawer.Snap id="item-1">
                        <SwapDetails type="contained" />
                    </VaulDrawer.Snap>
                </VaulDrawer>
                <>
                    {children}
                </>
            </DepositMethodProvider>
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

            if (data.metadata.AvailableTransactionAmount) {
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