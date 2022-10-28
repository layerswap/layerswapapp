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
import NetworkSettings from "../../../../lib/NetworkSettings";

type Props = {
    OnSumbit: (values: SwapFormValues) => Promise<void>
}

const MainStep: FC<Props> = ({ OnSumbit }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { activate, active, account, chainId } = useWeb3React<Web3Provider>();
    const { setLoading: setLoadingWizard, goToStep } = useFormWizardaUpdate<SwapCreateStep>()

    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectRhinoifiIsOpen, setConnectRhinofiIsOpen] = useState(false);
    const { swapFormData } = useSwapDataState()

    let formValues = formikRef.current?.values;
    const settings = useSettingsState();
    const { discovery: { resource_storage_url } } = settings.data || {}
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

    useEffect(() => {
        let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
        let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;

        if (isImtoken || isTokenPocket) {
            if (isImtoken) {
                setAddressSource("imtoken");
            }
            else if (isTokenPocket) {
                setAddressSource("tokenpocket");
            }
            const injected = new InjectedConnector({
                // Commented to allow visitors from other networks to use this page
                //supportedChainIds: supportedNetworks.map(x => x.chain_id)
            });

            if (!active) {
                activate(injected, onerror => {
                    if (onerror.message.includes('user_canceled')) {
                        new Error('You canceled the operation, please refresh and try to reauthorize.')
                        return
                    }
                    else if (onerror.message.includes('Unsupported chain')) {
                        // Do nothing
                    }
                    else {
                        new Error(`Failed to connect: ${onerror.message}`)
                        return
                    }
                });
            }
        }
    }, [settings])

    useEffect(() => {
        let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
        let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;
        setAddressSource((isImtoken && 'imtoken') || (isTokenPocket && 'tokenpocket') || query.addressSource)
    }, [query])


    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
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
            
            clearSwap()
            updateSwapFormData(values)
            await OnSumbit(values)
        }
        catch (e) {
            toast.error(e.message)
        }
    }, [updateSwapFormData])

    const destAddress: string = account || query.destAddress;

    const partner = addressSource ?
        settings.data.partners.find(p => p.internal_name?.toLocaleLowerCase() === addressSource?.toLocaleLowerCase())
        : undefined

    const isPartnerAddress = partner && destAddress;

    const isPartnerWallet = isPartnerAddress && partner?.is_wallet;

    const initialValues: SwapFormValues = swapFormData || generateSwapInitialValues(formValues?.swapType ?? SwapType.OnRamp, settings, query, account, chainId)
    const lockAddress = initialValues.destination_address != ""  && !!account || query.lockAddress;

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
            <SwapForm resource_storage_url={resource_storage_url} isPartnerWallet={isPartnerWallet} lockAddress={lockAddress}  partner={partner}/>
        </Formik >
    </>
}

export default MainStep
