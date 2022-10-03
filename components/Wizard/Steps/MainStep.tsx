import { Web3Provider } from "@ethersproject/providers";
import { ImmutableXClient } from "@imtbl/imx-sdk";
import { useWeb3React } from "@web3-react/core";
import { Form, Formik, FormikErrors, FormikProps } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { CryptoNetwork } from "../../../Models/CryptoNetwork";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { SelectMenuItem } from "../../Select/selectMenuItem";
import Image from 'next/image';
import SwapButton from "../../buttons/swapButton";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import React from "react";
import { useFormWizardaUpdate } from "../../../context/formWizardProvider";
import { SwapCreateStep } from "../../../Models/Wizard";
import axios from "axios";
import AmountAndFeeDetails from "../../DisclosureComponents/amountAndFeeDetailsComponent";
import ConnectImmutableX from "./ConnectImmutableX";
import ConnectRhinofi from "../../ConnectRhinofi";
import toast from "react-hot-toast";
import { InjectedConnector } from "@web3-react/injected-connector";
import { clearTempData, getTempData } from "../../../lib/openLink";
import AddressInput from "../../Input/AddressInput";
import { classNames } from "../../utils/classNames";
import KnownInternalNames from "../../../lib/knownIds";
import MainStepValidation from "../../../lib/mainStepValidator";
import SwapOptionsToggle from "../../SwapOptionsToggle";
import { ConnectedFocusError } from "../../../lib/external/ConnectedFocusError";
import { generateSwapInitialValues } from "../../../lib/generateSwapInitialValues";
import ExchangesField from "../../Select/Exchange";
import NetworkField from "../../Select/Network";
import AmountField from "../../Input/Amount";
import { SwapType } from "../../../lib/layerSwapApiClient";
import { AnimatePresence } from "framer-motion";
import SlideOver from "../../SlideOver";

type Props = {
    OnSumbit: (values: SwapFormValues) => void
}

const MainStep: FC<Props> = ({ OnSumbit }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { activate, active, account, chainId } = useWeb3React<Web3Provider>();
    const { setLoading: setLoadingWizard, goToStep } = useFormWizardaUpdate<SwapCreateStep>()

    const [loading, setLoading] = useState(false)
    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectRhinoifiIsOpen, setConnectRhinofiIsOpen] = useState(false);

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
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


    const availablePartners = Object.fromEntries(settings.data.partners.map(c => [c.internal_name.toLowerCase(), c]));

    const immutableXApiAddress = 'https://api.x.immutable.com/v1';

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            setLoading(true)
            clearSwap()
            updateSwapFormData(values)

            if (values.network.baseObject.internal_name == KnownInternalNames.Networks.ImmutableX) {
                const client = await ImmutableXClient.build({ publicApiUrl: immutableXApiAddress })
                const isRegistered = await client.isRegistered({ user: values.destination_address })
                if (!isRegistered) {
                    setConnectImmutableIsOpen(true)
                    setLoading(false)
                    return
                }
            } else if (values.network.baseObject.internal_name == KnownInternalNames.Networks.RhinoFiMainnet) {
                const client = await axios.get(`https://api.deversifi.com/v1/trading/registrations/${values.destination_address}`)
                const isRegistered = await client.data?.isRegisteredOnDeversifi
                if (!isRegistered) {
                    setConnectRhinofiIsOpen(true);
                    setLoading(false)
                    return
                }
            }
            OnSumbit(values)
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [updateSwapFormData])

    let destAddress: string = account || query.destAddress;

    let isPartnerAddress = addressSource && availablePartners[addressSource] && destAddress;
    let isPartnerWallet = isPartnerAddress && availablePartners[addressSource]?.is_wallet;

    const lockAddress = !!account || query.lockAddress

    const initialValues: SwapFormValues = generateSwapInitialValues(formValues?.swapType ?? SwapType.OnRamp, settings, query, account, chainId)

    const exchangeRef: any = useRef();
    const networkRef: any = useRef();
    const addressRef: any = useRef();
    const amountRef: any = useRef();

    return <>
        <SlideOver imperativeOpener={[connectImmutableIsOpen, setConnectImmutableIsOpen]} place='inStep'>
            {(close) => <ConnectImmutableX swapFormData={formValues} onClose={close} />}
        </SlideOver>
        <SlideOver imperativeOpener={[connectRhinoifiIsOpen, setConnectRhinofiIsOpen]} place='inStep'>
            {() => <ConnectRhinofi />}
        </SlideOver>
        <Formik
            enableReinitialize={true}
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation(settings)}
            onSubmit={handleSubmit}
        >
            {({ values, errors, isValid, dirty }) => (
                <Form className="h-full">
                    <ConnectedFocusError />
                    <div className="px-6 md:px-8 h-full flex flex-col justify-between">
                        <div>
                            <div className='my-4'>
                                <SwapOptionsToggle />
                            </div>
                            <div className={classNames(values.swapType === SwapType.OffRamp ? 'w-full flex-col-reverse md:flex-row-reverse space-y-reverse md:space-x-reverse' : 'md:flex-row flex-col', 'flex justify-between w-full md:space-x-4 space-y-4 md:space-y-0 mb-3.5 leading-4')}>
                                <div className="flex flex-col md:w-80 w-full">
                                    <AnimatePresence>
                                        <ExchangesField ref={exchangeRef} />
                                    </AnimatePresence>
                                </div>
                                <div className="flex flex-col md:w-80 w-full">
                                    <NetworkField ref={networkRef} />
                                </div>
                            </div>
                            {
                                values.swapType === SwapType.OnRamp && (() => { console.log(); return true })() &&
                                <div className="w-full mb-3.5 leading-4">
                                    <label htmlFor="destination_address" className="block font-normal text-primary-text text-sm">
                                        {`To ${values?.network?.name || ''} address`}
                                        {isPartnerWallet && <span className='truncate text-sm text-indigo-200'>({availablePartners[addressSource].display_name})</span>}
                                    </label>
                                    <div className="relative rounded-md shadow-sm mt-1.5">
                                        {isPartnerWallet &&
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Image className='rounded-md object-contain' src={availablePartners[addressSource].logo_url} width="24" height="24"></Image>
                                            </div>
                                        }
                                        <div>
                                            <AddressInput
                                                disabled={initialValues.destination_address != '' && lockAddress || (!values.network || !values.exchange)}
                                                name={"destination_address"}
                                                className={classNames(isPartnerWallet ? 'pl-11' : '', 'disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-600 border-darkblue-100 border rounded-md placeholder-gray-400 truncate')}
                                                ref={addressRef}
                                            />
                                        </div>
                                    </div>
                                </div>
                            }

                            <div className="mb-6 leading-4">
                                <AmountField ref={amountRef} />
                            </div>

                            <div className="w-full">
                                <AmountAndFeeDetails amount={Number(values?.amount)} swapType={values.swapType} currency={values.currency?.baseObject} exchange={values.exchange?.baseObject} network={values.network?.baseObject} />
                            </div>
                        </div>
                        <div className="mt-6">
                            <SwapButton type='submit' isDisabled={!isValid || !dirty} isSubmitting={loading}>
                                {displayErrorsOrSubmit(errors, values.swapType)}
                            </SwapButton>
                        </div>
                    </div >
                </Form >
            )}
        </Formik >
    </>
}

function displayErrorsOrSubmit(errors: FormikErrors<SwapFormValues>, swapType: SwapType): string {
    if (swapType == SwapType.OnRamp) {
        return errors.exchange?.toString() || errors.network?.toString() || errors.destination_address || errors.amount || "Swap now"
    }
    else {
        return errors.network?.toString() || errors.exchange?.toString() || errors.amount || "Swap now"
    }
}


export default MainStep