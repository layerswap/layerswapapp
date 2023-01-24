import { ImmutableXClient } from "@imtbl/imx-sdk";
import { Formik, FormikProps } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useQueryState } from "../../../../context/query";
import { useSettingsState } from "../../../../context/settings";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import { useSwapDataState, useSwapDataUpdate } from "../../../../context/swap";
import React from "react";
import { useFormWizardaUpdate } from "../../../../context/formWizardProvider";
import { SwapCreateStep } from "../../../../Models/Wizard";
import axios from "axios";
import ConnectImmutableX from "../ConnectImmutableX";
import ConnectNetwork from "../../../ConnectNetwork";
import toast from "react-hot-toast";
import { clearTempData, getTempData } from "../../../../lib/openLink";
import KnownInternalNames from "../../../../lib/knownIds";
import MainStepValidation from "../../../../lib/mainStepValidator";
import { generateSwapInitialValues } from "../../../../lib/generateSwapInitialValues";
import LayerSwapApiClient, { SwapType } from "../../../../lib/layerSwapApiClient";
import SlideOver from "../../../SlideOver";
import SwapForm from "./SwapForm";
import { isValidAddress } from "../../../../lib/addressValidator";
import NetworkSettings from "../../../../lib/NetworkSettings";
import { useRouter } from "next/router";

type Props = {
    OnSumbit: ({ values, swapId }: { values: SwapFormValues, swapId?: string }) => Promise<void>
}
type NetworkToConnect = {
    DisplayName: string;
    AppURL: string;
}
const MainStep: FC<Props> = ({ OnSumbit }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectNetworkiIsOpen, setConnectNetworkIsOpen] = useState(false);
    const [networkToConnect, setNetworkToConnect] = useState<NetworkToConnect>();
    const { swapFormData, swap } = useSwapDataState()
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const { discovery: { resource_storage_url } } = settings || {}
    const query = useQueryState();
    const { updateSwapFormData, clearSwap, setDepositeAddressIsfromAccount } = useSwapDataUpdate()

    useEffect(() => {
        if (query.coinbase_redirect) {
            const temp_data = getTempData()
            const five_minutes_before = new Date(new Date().setMinutes(-5))
            if (new Date(temp_data?.date) >= five_minutes_before) {
                (async () => {
                    try {
                        let formValues = { ...temp_data.swap_data }
                        if (temp_data?.swap_data?.swapType === SwapType.OffRamp) {
                            const layerswapApiClient = new LayerSwapApiClient(router)
                            const deposit_address = await layerswapApiClient.GetExchangeDepositAddress(KnownInternalNames.Exchanges.Coinbase, temp_data.swap_data?.currency?.baseObject?.asset)
                            formValues.destination_address = deposit_address?.data
                            setDepositeAddressIsfromAccount(true)
                        }
                        clearTempData()
                        formikRef.current.setValues(formValues)
                        updateSwapFormData(formValues)
                        if (formValues.swapType === SwapType.OnRamp) {
                            goToStep(SwapCreateStep.Confirm)
                        }
                    }
                    catch (e) {
                        toast(e?.response?.data?.error?.message || e.message)
                    }
                    setLoading(false)
                })()
            }
            else {
                setLoading(false)
            }
        }
        else {
            setLoading(false)
        }
    }, [query])

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            if (values.swapType === SwapType.OnRamp) {
                const internalName = values.to.baseObject.internal_name
                if (internalName == KnownInternalNames.Networks.ImmutableX || internalName == KnownInternalNames.Networks.ImmutableXGoerli) {
                    const client = await ImmutableXClient.build({ publicApiUrl: NetworkSettings.ImmutableXSettings[internalName].apiUri })
                    const isRegistered = await client.isRegistered({ user: values.destination_address })
                    if (!isRegistered) {
                        setConnectImmutableIsOpen(true)
                        return
                    }
                } else if (internalName == KnownInternalNames.Networks.RhinoFiMainnet) {
                    const client = await axios.get(`${NetworkSettings.RhinoFiSettings[internalName].apiUri}/${values.destination_address}`)
                    const isRegistered = await client.data?.isRegisteredOnDeversifi
                    if (!isRegistered) {
                        setNetworkToConnect({ DisplayName: values.to.baseObject.display_name, AppURL: NetworkSettings.RhinoFiSettings[internalName].appUri })
                        setConnectNetworkIsOpen(true);
                        return
                    }
                } else if (internalName == KnownInternalNames.Networks.DydxMainnet || internalName == KnownInternalNames.Networks.DydxGoerli) {
                    const client = await axios.get(`${NetworkSettings.DydxSettings[internalName].apiUri}${values.destination_address}`)
                    const isRegistered = await client.data?.exists
                    if (!isRegistered) {
                        setNetworkToConnect({ DisplayName: values.to.baseObject.display_name, AppURL: NetworkSettings.DydxSettings[internalName].appUri })
                        setConnectNetworkIsOpen(true);
                        return
                    }
                }
            }
            if (formikRef.current?.dirty) {
                clearSwap()
            }
            updateSwapFormData(values)
            await OnSumbit({ values, swapId: formikRef.current?.dirty ? null : swap?.id })
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [updateSwapFormData, swap])

    const destAddress: string = query.destAddress;

    const partner = query?.addressSource ?
        settings.partners.find(p => p.internal_name?.toLocaleLowerCase() === query?.addressSource?.toLocaleLowerCase())
        : undefined

    const isPartnerAddress = partner && destAddress;

    const isPartnerWallet = isPartnerAddress && partner?.is_wallet;

    const initialValues: SwapFormValues = swapFormData || generateSwapInitialValues(formValues?.swapType, settings, query)
    const lockAddress =
        (initialValues.destination_address && initialValues.to)
        && isValidAddress(initialValues.destination_address, initialValues.to?.baseObject)
        && ((query.lockAddress && (query.addressSource !== "imxMarketplace" || settings.validSignatureisPresent)));

    return <>
        <SlideOver imperativeOpener={[connectImmutableIsOpen, setConnectImmutableIsOpen]} place='inStep'>
            {(close) => <ConnectImmutableX network={formValues?.to?.baseObject} onClose={close} />}
        </SlideOver>
        <SlideOver imperativeOpener={[connectNetworkiIsOpen, setConnectNetworkIsOpen]} place='inStep'>
            {() => <ConnectNetwork NetworkDisplayName={networkToConnect.DisplayName} AppURL={networkToConnect.AppURL} />}
        </SlideOver>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation(settings)}
            onSubmit={handleSubmit}
        >
            <SwapForm loading={loading} resource_storage_url={resource_storage_url} isPartnerWallet={isPartnerWallet} lockAddress={lockAddress} partner={partner} />
        </Formik >
    </>
}

export default MainStep
