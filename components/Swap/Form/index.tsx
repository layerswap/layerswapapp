import { ImmutableXClient } from "@imtbl/imx-sdk";
import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import React from "react";
import axios from "axios";
import ConnectImmutableX from "./ConnectImmutableX";
import ConnectNetwork from "../../ConnectNetwork";
import toast from "react-hot-toast";
import { clearTempData, getTempData } from "../../../lib/openLink";
import KnownInternalNames from "../../../lib/knownIds";
import MainStepValidation from "../../../lib/mainStepValidator";
import { generateSwapInitialValues } from "../../../lib/generateSwapInitialValues";
import LayerSwapApiClient from "../../../lib/layerSwapApiClient";
import Modal from "../../modal/modal";
import SwapForm from "./Form";
import NetworkSettings from "../../../lib/NetworkSettings";
import { useRouter } from "next/router";
import useSWR from "swr";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import InternalApiClient from "../../../lib/internalApiClient";
import TokenService from "../../../lib/TokenService";
import LayerSwapAuthApiClient from "../../../lib/userAuthApiClient";
import { UserType, useAuthDataUpdate } from "../../../context/authContext";
import { ApiError, KnownErrorCode } from "../../../Models/ApiError";

type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}

export default function () {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const [showConnectImmutable, setShowConnectImmutable] = useState(false);
    const [showConnectNetworkModal, setShowConnectNetworkModal] = useState(false);
    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const { swap } = useSwapDataState()
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { updateAuthData, setUserType } = useAuthDataUpdate()
    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const query = useQueryState();
    const { setDepositeAddressIsfromAccount, createSwap } = useSwapDataUpdate()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(query?.addressSource && `/apps?name=${query?.addressSource}`, layerswapApiClient.fetcher)
    const partner = query?.addressSource && partnerData?.data?.name?.toLowerCase() === query?.addressSource?.toLowerCase() ? partnerData?.data : undefined


    useEffect(() => {
        if (query.coinbase_redirect) {
            const temp_data = getTempData()
            const five_minutes_before = new Date(new Date().setMinutes(-5))
            let formValues = { ...temp_data?.swap_data }
            const source = formValues?.from
            if (new Date(temp_data?.date) >= five_minutes_before) {
                (async () => {
                    try {

                        if (temp_data?.swap_data?.to?.isExchange) {
                            const layerswapApiClient = new LayerSwapApiClient(router)
                            const deposit_address = await layerswapApiClient.GetExchangeDepositAddress(KnownInternalNames.Exchanges.Coinbase, temp_data.swap_data?.currency?.asset)
                            formValues.destination_address = deposit_address?.data
                            setDepositeAddressIsfromAccount(true)
                        }
                    }
                    catch (e) {
                        toast(e?.response?.data?.error?.message || e.message)
                    }

                })()
            }
            if (temp_data) {
                clearTempData()
                formikRef.current.resetForm({ values: formValues })
            }
            setLoading(false)
        }
        else {
            const initialValues = generateSwapInitialValues(settings, query)
            formikRef.current.resetForm({ values: initialValues })
            formikRef.current.validateForm(initialValues)
            setLoading(false)
        }
    }, [query, settings])

    
    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            const destination_internal_name = values?.to?.internal_name
            if (destination_internal_name == KnownInternalNames.Networks.ImmutableXMainnet || destination_internal_name == KnownInternalNames.Networks.ImmutableXGoerli) {
                const client = await ImmutableXClient.build({ publicApiUrl: NetworkSettings.ImmutableXSettings[destination_internal_name].apiUri })
                const isRegistered = await client.isRegistered({ user: values.destination_address })
                if (!isRegistered) {
                    setShowConnectImmutable(true)
                    return
                }
            } else if (destination_internal_name == KnownInternalNames.Networks.RhinoFiMainnet) {
                const client = await axios.get(`${NetworkSettings.RhinoFiSettings[destination_internal_name].apiUri}/${values.destination_address}`)
                const isRegistered = await client.data?.isRegisteredOnDeversifi
                if (!isRegistered) {
                    setNetworkToConnect({ DisplayName: values.to?.display_name, AppURL: NetworkSettings.RhinoFiSettings[destination_internal_name].appUri })
                    setShowConnectNetworkModal(true);
                    return
                }
            } else if (destination_internal_name == KnownInternalNames.Networks.DydxMainnet || destination_internal_name == KnownInternalNames.Networks.DydxGoerli) {
                const client = await axios.get(`${NetworkSettings.DydxSettings[destination_internal_name].apiUri}${values.destination_address}`)
                const isRegistered = await client.data?.exists
                if (!isRegistered) {
                    setNetworkToConnect({ DisplayName: values.to?.display_name, AppURL: NetworkSettings.DydxSettings[destination_internal_name].appUri })
                    setShowConnectNetworkModal(true);
                    return
                }
            }

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

            if (query.addressSource === "imxMarketplace" && settings.validSignatureisPresent) {
                try {
                    const account = await layerswapApiClient.GetWhitelistedAddress(values?.to?.internal_name, query.destAddress)
                }
                catch (e) {
                    //TODO handle account not found
                    const internalApiClient = new InternalApiClient()
                    await internalApiClient.VerifyWallet(window.location.search);
                }
            }
            const swapId = await createSwap(values, query, partner);
            await router.push(`/swap/${swapId}`)
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (data?.code === KnownErrorCode.BLACKLISTED_ADDRESS) {
                toast.error('You can’t transfer to that address. Please double check your wallet’s address and change it in the previous page.')
            }
            else {
                toast.error(error.message)
            }
        }
    }, [swap, settings, query, partner])

    const destAddress: string = query.destAddress;


    const isPartnerAddress = partner && destAddress;

    const isPartnerWallet = isPartnerAddress && partner?.is_wallet;

    const initialValues: SwapFormValues = generateSwapInitialValues(settings, query)
    const source = formValues?.from
    const destination = formValues?.to

    return <>
        <Modal show={showConnectImmutable} setShow={setShowConnectImmutable} >
            <ConnectImmutableX network={((source?.isExchange && formValues?.to) || (destination?.isExchange && formValues?.from) || (!source?.isExchange && !destination?.isExchange) && (formValues?.to || formValues?.from))} onClose={close} />
        </Modal>
        <Modal show={showConnectNetworkModal} setShow={setShowConnectNetworkModal} header={`${networkToConnect?.DisplayName} connect`}>
            <ConnectNetwork NetworkDisplayName={networkToConnect?.DisplayName} AppURL={networkToConnect?.AppURL} />
        </Modal>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation({ settings, query })}
            onSubmit={handleSubmit}
        >
            <SwapForm loading={loading} isPartnerWallet={isPartnerWallet} partner={partner} />
        </Formik>
    </>
}

