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
import ConnectRhinofi from "../../../ConnectRhinofi";
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
import SpinIcon from "../../../icons/spinIcon";

type Props = {
    OnSumbit: (values: SwapFormValues) => Promise<void>
}

const MainStep: FC<Props> = ({ OnSumbit }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()

    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectRhinoifiIsOpen, setConnectRhinofiIsOpen] = useState(false);
    const { swapFormData } = useSwapDataState()
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const { discovery: { resource_storage_url } } = settings || {}
    const query = useQueryState();
    const { updateSwapFormData, clearSwap } = useSwapDataUpdate()

    useEffect(() => {
        if (query.coinbase_redirect) {
            const temp_data = getTempData()
            const five_minutes_before = new Date(new Date().setMinutes(-5))
            if (new Date(temp_data?.date) >= five_minutes_before) {
                (async () => {
                    const layerswapApiClient = new LayerSwapApiClient(router)
                    try {
                        const deposit_address = await layerswapApiClient.GetExchangeDepositAddress(KnownInternalNames.Exchanges.Coinbase, temp_data.swap_data?.currency?.baseObject?.asset)
                        clearTempData()
                        const formValues = { ...temp_data.swap_data, destination_address: deposit_address?.data }
                        formikRef.current.setValues(formValues)
                        updateSwapFormData(formValues)
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
                const internalName = values.network.baseObject.internal_name
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
                        setConnectRhinofiIsOpen(true);
                        return
                    }
                }
            }
            if (formikRef.current?.dirty)
                clearSwap()
            updateSwapFormData(values)
            await OnSumbit(values)
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [updateSwapFormData])

    const destAddress: string = query.destAddress;

    const partner = query?.addressSource ?
        settings.partners.find(p => p.internal_name?.toLocaleLowerCase() === query?.addressSource?.toLocaleLowerCase())
        : undefined

    const isPartnerAddress = partner && destAddress;

    const isPartnerWallet = isPartnerAddress && partner?.is_wallet;

    const initialValues: SwapFormValues = swapFormData || generateSwapInitialValues(formValues?.swapType, settings, query)
    const lockAddress =
        (initialValues.destination_address && initialValues.network)
        && isValidAddress(initialValues.destination_address, initialValues.network?.baseObject)
        && ((query.lockAddress && (query.addressSource !== "imxMarketplace" || settings.validSignatureisPresent)));

    return <>
        <SlideOver imperativeOpener={[connectImmutableIsOpen, setConnectImmutableIsOpen]} place='inStep'>
            {(close) => <ConnectImmutableX network={formValues?.network?.baseObject} onClose={close} />}
        </SlideOver>
        <SlideOver imperativeOpener={[connectRhinoifiIsOpen, setConnectRhinofiIsOpen]} place='inStep'>
            {() => <ConnectRhinofi />}
        </SlideOver>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation(settings)}
            onSubmit={handleSubmit}
        >
            {
                !loading ? <SwapForm resource_storage_url={resource_storage_url} isPartnerWallet={isPartnerWallet} lockAddress={lockAddress} partner={partner} />
                    : <div className="w-full h-full flex items-center"><SpinIcon className="animate-spin h-8 w-8 grow" /></div>
            }
        </Formik >
    </>
}

export default MainStep
