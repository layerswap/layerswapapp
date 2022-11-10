import { Web3Provider } from "@ethersproject/providers";
import { ImmutableXClient } from "@imtbl/imx-sdk";
import { useWeb3React } from "@web3-react/core";
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
import { InjectedConnector } from "@web3-react/injected-connector";
import { clearTempData, getTempData } from "../../../../lib/openLink";
import KnownInternalNames from "../../../../lib/knownIds";
import MainStepValidation from "../../../../lib/mainStepValidator";
import { generateSwapInitialValues } from "../../../../lib/generateSwapInitialValues";
import { SwapType } from "../../../../lib/layerSwapApiClient";
import SlideOver from "../../../SlideOver";
import SwapForm from "./SwapForm";
import { isValidAddress } from "../../../../lib/addressValidator";
import NetworkSettings from "../../../../lib/NetworkSettings";

type Props = {
    OnSumbit: (values: SwapFormValues) => Promise<void>
}

const MainStep: FC<Props> = ({ OnSumbit }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { setLoading: setLoadingWizard, goToStep } = useFormWizardaUpdate<SwapCreateStep>()

    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectRhinoifiIsOpen, setConnectRhinofiIsOpen] = useState(false);
    const { swapFormData } = useSwapDataState()

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const { discovery: { resource_storage_url } } = settings || {}
    const query = useQueryState();
    const [addressSource, setAddressSource] = useState("")
    const { updateSwapFormData, clearSwap } = useSwapDataUpdate()

    useEffect(() => {
        if (query.coinbase_redirect) {
            const temp_data = getTempData()
            const five_minutes_before = new Date(new Date().setMinutes(-5))
            if (new Date(temp_data?.date) >= five_minutes_before) {
                clearTempData()
                formikRef.current.setValues(temp_data.swap_data)
                updateSwapFormData(temp_data.swap_data)
                goToStep(SwapCreateStep.Confirm)
            }
        }
        setTimeout(() => {
            setLoadingWizard(false)
        }, 500);
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

    const partner = addressSource ?
        settings.partners.find(p => p.internal_name?.toLocaleLowerCase() === addressSource?.toLocaleLowerCase())
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
            <SwapForm resource_storage_url={resource_storage_url} isPartnerWallet={isPartnerWallet} lockAddress={lockAddress} partner={partner} />
        </Formik >
    </>
}

export default MainStep
