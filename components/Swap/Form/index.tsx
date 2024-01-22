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
import LayerSwapApiClient from "../../../lib/layerSwapApiClient";
import Modal from "../../modal/modal";
import SwapForm from "./Form";
import { useRouter } from "next/router";
import useSWR from "swr";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import { UserType, useAuthDataUpdate } from "../../../context/authContext";
import { ApiError, LSAPIKnownErrorCode } from "../../../Models/ApiError";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import { useQueryState } from "../../../context/query";
import TokenService from "../../../lib/TokenService";
import LayerSwapAuthApiClient from "../../../lib/userAuthApiClient";
import StatusIcon from "../../SwapHistory/StatusIcons";
import Image from 'next/image';
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useFee } from "../../../context/feeContext";
import ResizablePanel from "../../ResizablePanel";
import getSecondsToTomorrow from "../../utils/getSecondsToTomorrow";

type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}
const SwapDetails = dynamic(() => import(".."), {
    loading: () => <div className="w-full h-[450px]">
        <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
                <div className="h-32 bg-secondary-700 rounded-lg"></div>
                <div className="h-40 bg-secondary-700 rounded-lg"></div>
                <div className="h-12 bg-secondary-700 rounded-lg"></div>
            </div>
        </div>
    </div>
})

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
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(query?.appName && `/apps?name=${query?.appName}`, layerswapApiClient.fetcher)
    const partner = query?.appName && partnerData?.data?.name?.toLowerCase() === (query?.appName as string)?.toLowerCase() ? partnerData?.data : undefined

    const { swap } = useSwapDataState()
    const { minAllowedAmount, maxAllowedAmount } = useFee()

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
                if (params && Object.keys(params).length) {
                    const search = new URLSearchParams(params as any);
                    if (search)
                        swapURL += `?${search}`
                }
                window.history.replaceState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
                setShowSwapModal(true)
            }
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (data?.code === LSAPIKnownErrorCode.BLACKLISTED_ADDRESS) {
                toast.error("You can't transfer to that address. Please double check.")
            }
            else if (data?.code === LSAPIKnownErrorCode.INVALID_ADDRESS_ERROR) {
                toast.error(`Enter a valid ${values.to?.display_name} address`)
            }
            else if (data?.code === LSAPIKnownErrorCode.UNACTIVATED_ADDRESS_ERROR && values.to) {
                setNetworkToConnect({
                    DisplayName: values.to.display_name,
                    AppURL: data.message
                })
                setShowConnectNetworkModal(true);
            } else if (data.code === LSAPIKnownErrorCode.NETWORK_CURRENCY_DAILY_LIMIT_REACHED) {
                const remainingTimeInHours = getSecondsToTomorrow() / 3600
                const remainingTimeInMinutes = getSecondsToTomorrow() / 60
                const remainingTime = remainingTimeInHours >= 1 ? `${remainingTimeInHours.toFixed()} hours` : `${remainingTimeInMinutes.toFixed()} minutes`
                toast.error(`Daily limit of ${values.fromCurrency?.asset} transfers from ${values.from?.display_name} is reached. Please try sending up to ${data.metadata.AvailableTransactionAmount} ${values.fromCurrency?.asset} or retry in ${remainingTime}.`)
            }
            else {
                toast.error(data.message || error.message)
            }
        }
    }, [createSwap, query, partner, router, updateAuthData, setUserType, swap])

    const destAddress: string = query?.destAddress as string;

    const isPartnerAddress = partner && destAddress;

    const isPartnerWallet = isPartnerAddress && partner?.is_wallet;

    const initialValues: SwapFormValues = swap ? generateSwapInitialValuesFromSwap(swap, settings)
        : generateSwapInitialValues(settings, query)
    const initiallyValidation = MainStepValidation({ minAllowedAmount, maxAllowedAmount })(initialValues)
    const initiallyIsValid = Object.values(initiallyValidation)?.filter(v => v).length > 0

    return <>
        <div className="rounded-r-lg cursor-pointer absolute z-10 md:mt-3 border-l-0">
            <AnimatePresence mode='wait'>
                {
                    swap &&
                    !showSwapModal &&
                    <PendingSwap key="pendingSwap" onClick={() => setShowSwapModal(true)} />
                }
            </AnimatePresence>
        </div>
        <Modal height="fit" show={showConnectNetworkModal} setShow={setShowConnectNetworkModal} header={`${networkToConnect?.DisplayName} connect`} modalId="showNetwork">
            {networkToConnect && <ConnectNetwork NetworkDisplayName={networkToConnect?.DisplayName} AppURL={networkToConnect?.AppURL} />}
        </Modal>
        <Modal height='fit' show={showSwapModal} setShow={setShowSwapModal} header={`Complete the swap`} modalId="showSwap">
            <ResizablePanel>
                <SwapDetails type="contained" />
            </ResizablePanel>
        </Modal>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation({ minAllowedAmount, maxAllowedAmount })}
            onSubmit={handleSubmit}
            isInitialValid={!initiallyIsValid}
        >
            <SwapForm isPartnerWallet={!!isPartnerWallet} partner={partner} />
        </Formik>
    </>
}
const textMotion = {
    rest: {
        color: "grey",
        x: 0,
        transition: {
            duration: 0.4,
            type: "tween",
            ease: "easeIn"
        }
    },
    hover: {
        color: "blue",
        x: 30,
        transition: {
            duration: 0.4,
            type: "tween",
            ease: "easeOut"
        }
    }
};

const PendingSwap = ({ onClick }: { onClick: () => void }) => {
    const { swap } = useSwapDataState()
    const {
        destination_network: destination_network_internal_name,
        source_network: source_network_internal_name,
        destination_exchange,
        source_exchange
    } = swap || {}

    const settings = useSettingsState()

    if (!swap)
        return <></>

    const { resolveImgSrc, layers, exchanges } = settings
    const source = layers.find(e => e.internal_name === source_network_internal_name)
    const destination = layers.find(n => n.internal_name === destination_network_internal_name)

    const sourceExchange = exchanges.find(e => e.internal_name === source_exchange)
    const destExchange = exchanges.find(e => e.internal_name === destination_exchange)

    return <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
    >
        <motion.div
            onClick={onClick}
            initial="rest" whileHover="hover" animate="rest"
            className="relative bg-secondary-600 rounded-r-lg">
            <motion.div
                variants={textMotion}
                className="flex items-center bg-secondary-600 rounded-r-lg">
                <div className="text-primary-text flex px-3 p-2 items-center space-x-2">
                    <span className="flex items-center">
                        {swap && <StatusIcon swap={swap} short={true} />}
                    </span>
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        {sourceExchange ? <Image
                            src={resolveImgSrc(sourceExchange)}
                            alt="From Logo"
                            height="60"
                            width="60"
                            className="rounded-md object-contain"
                        /> : source ?
                            <Image
                                src={resolveImgSrc(source)}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            /> : null
                        }
                    </div>
                    <ChevronRight className="block h-4 w-4 mx-1" />
                    <div className="flex-shrink-0 h-5 w-5 relative block">
                        {destExchange ? <Image
                            src={resolveImgSrc(destination)}
                            alt="To Logo"
                            height="60"
                            width="60"
                            className="rounded-md object-contain"
                        /> : destination ?
                            <Image
                                src={resolveImgSrc(destination)}
                                alt="To Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            /> : null
                        }
                    </div>
                </div>

            </motion.div>
        </motion.div>
    </motion.div>
}