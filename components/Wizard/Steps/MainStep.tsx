import { Web3Provider } from "@ethersproject/providers";
import { ImmutableXClient } from "@imtbl/imx-sdk";
import { useWeb3React } from "@web3-react/core";
import { Field, Form, Formik, FormikErrors, FormikProps, useField, useFormikContext } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useAccountState } from "../../../context/account";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { CryptoNetwork } from "../../../Models/CryptoNetwork";
import { Currency } from "../../../Models/Currency";
import { Exchange } from "../../../Models/Exchange";
import { Partner } from "../../../Models/Partner";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import InsetSelectMenu from "../../selectMenu/insetSelectMenu";
import SelectMenu from "../../selectMenu/selectMenu";
import { SelectMenuItem } from "../../selectMenu/selectMenuItem";
import Image from 'next/image'
import SwapButton from "../../buttons/swapButton";
import { useWizardState } from "../../../context/wizard";
import { useSwapDataUpdate } from "../../../context/swap";
import Select from "../../Select/Select";
import React from "react";
import { useInterval } from "../../../hooks/useInyterval";
import { useFormWizardaUpdate, useFormWizardState } from "../../../context/formWizardProvider";
import { ExchangeAuthorizationSteps, FormWizardSteps } from "../../../Models/Wizard";
import TokenService from "../../../lib/TokenService";
import { useUserExchangeDataUpdate } from "../../../context/userExchange";
import axios from "axios";
import LayerSwapAuthApiClient from "../../../lib/userAuthApiClient";
import { ExclamationIcon } from "@heroicons/react/outline";
import AmountAndFeeDetails from "../../amountAndFeeDetailsComponent";
import ConnectImmutableX from "./ConnectImmutableX";
import ConnectDeversifi from "../../ConnectDeversifi";
import SendFeedback from "../../sendFeedback";
import SlideOver, { SildeOverRef } from "../../SlideOver";
import { DocIframe } from "../../docInIframe";
import toast from "react-hot-toast";
import { BlacklistedAddress } from "../../../Models/BlacklistedAddress";
import { InjectedConnector } from "@web3-react/injected-connector";
import { isValidAddress } from "../../../lib/addressValidator";


const immutableXApiAddress = 'https://api.x.immutable.com/v1';
const Logger = () => {
    const formik = useFormikContext();
    useEffect(() => {
        console.groupEnd();
    }, [
        formik.values,
        formik.errors,
        formik.touched,
        formik.isSubmitting,
        formik.isValidating,
        formik.submitCount
    ]);
    return null;
};
const CurrenciesField: FC = () => {
    const {
        values: { network, currency, exchange },
        setFieldValue,
        touched,
    } = useFormikContext<SwapFormValues>();

    const name = "currency"
    const { currencies, exchanges } = useSettingsState();

    const currencyMenuItems: SelectMenuItem<Currency>[] = network ? currencies
        .filter(x => x.network_id === network.baseObject.id)
        .map(c => ({
            baseObject: c,
            id: c.id,
            name: c.asset,
            order: c.order,
            imgSrc: c.logo_url,
            isAvailable: c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id),
            isEnabled: c.is_enabled,
            isDefault: c.is_default,
        })).sort((x, y) => {
            if (!y.isEnabled) {
                y.order = 100;
            } else if (!x.isEnabled) {
                x.order = 100;
            };
            return Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault) + x.order - y.order)
        })
        : []

    // ?.sort((x, y) => (Number(y.baseObject.is_default) - Number(x.baseObject.is_default) + (Number(y.baseObject.is_default) - Number(x.baseObject.is_default))))

    useEffect(() => {
        if (network) {
            // const alternativeToSelectedValue = currency && currencyMenuItems?.find(c => c.name === currency.name)
            const default_currency = currencies.sort((x, y) => Number(y.is_default) - Number(x.is_default)).find(c => c.is_enabled && c.network_id === network.baseObject.id && c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id))


            // if(alternativeToSelectedValue){
            //     setFieldValue(name, alternativeToSelectedValue)
            // }
            // else{
            if (default_currency) {
                const defaultValue: SelectMenuItem<Currency> = {
                    baseObject: default_currency,
                    id: default_currency.id,
                    name: default_currency.asset,
                    order: default_currency.order,
                    imgSrc: default_currency.logo_url,
                    isAvailable: default_currency.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id),
                    isEnabled: default_currency.is_enabled,
                    isDefault: default_currency.is_default,
                }
                setFieldValue(name, defaultValue)
            }
            else {
                setFieldValue(name, null)
            }

            // }
        }

    }, [network, setFieldValue, exchange, currencies, exchanges])

    return (<>
        <Field disabled={!currencyMenuItems?.length} name={name} values={currencyMenuItems} value={currency} as={Select} setFieldValue={setFieldValue} />
    </>)
};

const ExchangesField = React.forwardRef((props: any, ref: any) => {
    const {
        values: { exchange, currency },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const settings = useSettingsState();

    const exchangeMenuItems: SelectMenuItem<Exchange>[] = settings.exchanges
        .map(e => ({
            baseObject: e,
            id: e.internal_name,
            name: e.name,
            order: e.order,
            imgSrc: e.logo_url,
            isAvailable: true, //currency?.baseObject?.exchanges?.some(ce => ce.exchangeId === e.id),
            isEnabled: e.is_enabled,
            isDefault: e.is_default
        })).sort((x, y) => {
            if (!y.isEnabled) {
                y.order = 100;
            } else if (!x.isEnabled) {
                x.order = 100;
            };
            return Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault) + x.order - y.order)
        });

    return (<>
        <label htmlFor="exchange" className="block font-normal text-pink-primary-300 text-sm">
            From
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${!exchange ? 'ring-pink-primary border-pink-primary' : ''} focus:ring-pink-primary focus:border-pink-primary border-ouline-blue border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name="exchange" placeholder="Choose exchange" values={exchangeMenuItems} label="From" value={exchange} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});

const NetworkField = React.forwardRef((props: any, ref: any) => {
    const {
        values: { exchange, network, currency },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = "network"
    const { lockNetwork } = useQueryState()
    const { currencies, networks } = useSettingsState();

    const networkMenuItems: SelectMenuItem<CryptoNetwork>[] = networks
        .map(n => ({
            baseObject: n,
            id: n.code,
            name: n.name,
            order: n.order,
            imgSrc: n.logo_url,
            isAvailable: !lockNetwork && !n.is_test_net,
            isEnabled: n.is_enabled && currencies.some(c => c.is_enabled && c.network_id === n.id && c.exchanges.some(ce => ce.exchange_id === exchange?.baseObject?.id)),
            isDefault: n.is_default
        })).sort((x, y) => {
            if (!y.isEnabled) {
                y.order = 100;
            } else if (!x.isEnabled) {
                x.order = 100;
            };
            return Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault) + x.order - y.order)
        });

    if (exchange && !network)
        ref.current?.focus()

    return (<>
        <label htmlFor="network" className="block font-normal text-pink-primary-300 text-sm">
            To
        </label>
        <div ref={ref} tabIndex={0} className={`mt-1.5 ${exchange && !network ? 'ring-pink-primary border-pink-primary' : ''} focus:ring-pink-primary focus:border-pink-primary border-ouline-blue border focus:ring-1 overflow-hidden rounded-lg`}>
            <Field name="network" placeholder="Choose network" values={networkMenuItems} label="To" value={network} as={Select} setFieldValue={setFieldValue} />
        </div>
    </>)
});

const AmountField = React.forwardRef((props: any, ref: any) => {
    const {
        values: { network, currency },
        handleChange,
    } = useFormikContext<SwapFormValues>();

    const name = "amount"

    const [field, meta, helpers] = useField(name)

    const placeholder = currency ? `${currency?.baseObject?.min_amount} - ${currency?.baseObject?.max_amount}` : '0.01234'

    const step = 1 / Math.pow(10, currency?.baseObject?.decimals)

    return (<>
        <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
            Amount
        </label>
        <div className="flex rounded-md shadow-sm mt-1.5 bg-darkblue-600 border-ouline-blue border ">
            <input
                {...field}
                pattern="^[0-9]*[.,]?[0-9]*$"
                inputMode="decimal"
                autoComplete="off"
                disabled={!currency}
                placeholder={placeholder}
                autoCorrect="off"
                min={currency?.baseObject?.min_amount}
                max={currency?.baseObject?.max_amount}
                type="text"
                step={isNaN(step) ? 0.01 : step}
                name={name}
                id="amount"
                ref={ref}
                className="disabled:cursor-not-allowed h-12 bg-darkblue-600 focus:ring-pink-primary focus:border-pink-primary flex-grow block w-full min-w-0 rounded-none rounded-l-md sm:text-sm font-semibold placeholder-gray-400 border-0"
                onChange={e => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e)
                }}
            />
            <span className="ml-1 inline-flex items-center">
                <CurrenciesField />
            </span>
        </div>
    </>)
});

export default function MainStep() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { activate, active, account, chainId } = useWeb3React<Web3Provider>();

    // const { nextStep } = useWizardState();
    const { goToStep, setLoading: setLoadingWizard } = useFormWizardaUpdate<FormWizardSteps>()

    const [loading, setLoading] = useState(false)
    const [connectImmutableIsOpen, setConnectImmutableIsOpen] = useState(false);
    const [connectDeversifiIsOpen, setConnectDeversifiIsOpen] = useState(false);

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const query = useQueryState();
    const [addressSource, setAddressSource] = useState("")
    const { updateSwapFormData, clearSwap } = useSwapDataUpdate()
    const { getUserExchanges } = useUserExchangeDataUpdate()

    useEffect(() => {
        setTimeout(() => {
            setLoadingWizard(false)
        }, 500);
    }, [])


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

    let availableCurrencies = settings.currencies
        .map(c => new SelectMenuItem<Currency>(c, c.id, c.asset, c.order, c.logo_url, c.is_enabled, c.is_default))
        .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));
    let availableExchanges = settings.exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))
        .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));
    let availableNetworks = settings.networks
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, c.order, c.logo_url, c.is_enabled, c.is_default))
        .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));

    const availablePartners = Object.fromEntries(settings.partners.map(c => [c.name.toLowerCase(), c]));

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            setLoading(true)
            clearSwap()
            await updateSwapFormData(values)
            const accessToken = TokenService.getAuthData()?.access_token
            if (!accessToken)
                goToStep("Email")
            else {
                if (values.network.baseObject.code.toLowerCase().includes("immutablex")) {
                    const client = await ImmutableXClient.build({ publicApiUrl: immutableXApiAddress })
                    const isRegistered = await client.isRegistered({ user: values.destination_address })
                    if (!isRegistered) {
                        setConnectImmutableIsOpen(true)
                        setLoading(false)
                        return
                    }
                } else if (values.network.baseObject.id.includes("82024449-400c-40cf-a466-57b24ea611e2")) {
                    const client = await axios.get(`https://api.deversifi.com/v1/trading/registrations/${values.destination_address}`)
                    const isRegistered = await client.data?.isRegisteredOnDeversifi
                    if (!isRegistered) {
                        setConnectDeversifiIsOpen(true);
                        setLoading(false)
                        return
                    }
                }
                const exchanges = await (await getUserExchanges(accessToken))?.data
                const exchangeIsEnabled = exchanges?.some(e => e.exchange === values?.exchange?.id && e.is_enabled)
                if (values?.exchange?.baseObject?.authorization_flow === "none" || !values?.exchange?.baseObject?.authorization_flow || exchangeIsEnabled)
                    goToStep("SwapConfirmation")
                else
                    goToStep(ExchangeAuthorizationSteps[values?.exchange?.baseObject?.authorization_flow])
            }
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [updateSwapFormData])

    let destAddress: string = account || query.destAddress;
    let destNetwork: string = (chainId && settings.networks.find(x => x.chain_id == chainId)?.code) || query.destNetwork;


    let isPartnerAddress = addressSource && availablePartners[addressSource] && destAddress;
    let isPartnerWallet = isPartnerAddress && availablePartners[addressSource]?.is_wallet;
    
    let initialNetwork =
        availableNetworks.find(x => x.baseObject.code.toUpperCase() === destNetwork?.toUpperCase() && x.isEnabled)

    const lockNetwork = !!chainId
    const asset = query.asset
    const sourceExchangeName = query.sourceExchangeName
    const lockAddress = !!account || query.lockAddress

    if (lockNetwork) {
        availableNetworks.forEach(x => {
            if (x != initialNetwork)
                x.isEnabled = false;
        })
    }

    let initialAddress = destAddress && initialNetwork && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";

    let initialExchange = availableExchanges.find(x => x.baseObject.internal_name === sourceExchangeName?.toLowerCase());
    const initialValues: SwapFormValues = { amount: '', network: initialNetwork, destination_address: initialAddress, exchange: initialExchange };
    const exchangeRef: any = useRef();
    const networkRef: any = useRef();
    const addressRef: any = useRef();
    const amountRef: any = useRef();

    const closeConnectImmutableX = () => {
        setConnectImmutableIsOpen(false)
    }

    const closeConnectDeversifi = () => {
        setConnectDeversifiIsOpen(false)
    }
    return <>
        <ConnectImmutableX isOpen={connectImmutableIsOpen} swapFormData={formValues} onClose={closeConnectImmutableX} />
        <ConnectDeversifi isOpen={connectDeversifiIsOpen} swapFormData={formValues} onClose={closeConnectDeversifi} />
        <Formik
            enableReinitialize={true}
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={values => {
                let errors: FormikErrors<SwapFormValues> = {};
                let amount = Number(values.amount?.toString()?.replace(",", "."));

                if (!values.exchange) {
                    errors.amount = 'Select exchange'
                }
                else if (!values.network) {
                    errors.amount = 'Select network'
                }
                else if (!values.destination_address) {
                    errors.amount = `Enter ${values?.network?.name} address`
                    if (!formikRef.current.getFieldMeta("destination_address").touched)
                        addressRef?.current?.focus()
                }
                else if (!isValidAddress(values.destination_address, values.network?.baseObject)) {
                    errors.amount = `Enter a valid ${values?.network?.name} address`
                    if (!formikRef.current.getFieldMeta("destination_address").touched)
                        addressRef?.current?.focus()
                }
                else if (settings.blacklistedAddresses.some(ba => (!ba.network_id || ba.network_id === values.network?.baseObject?.id) && ba.address?.toLocaleLowerCase() === values.destination_address?.toLocaleLowerCase())) {
                    errors.amount = `You can not transfer to this address`
                    if (!formikRef.current.getFieldMeta("destination_address").touched)
                        addressRef?.current?.focus()
                }
                else if (!amount) {
                    errors.amount = 'Enter an amount'
                    if (!formikRef.current.getFieldMeta("amount").touched)
                        amountRef?.current?.focus()
                }
                else if (
                    !/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())
                ) {
                    errors.amount = 'Invalid amount'
                    if (!formikRef.current.getFieldMeta("amount").touched)
                        amountRef?.current?.focus()
                }
                else if (amount < 0) {
                    errors.amount = "Can't be negative"
                    if (!formikRef.current.getFieldMeta("amount").touched)
                        amountRef?.current?.focus()
                }
                else if (amount > values.currency?.baseObject.max_amount) {
                    errors.amount = `Max amount is ${values.currency.baseObject.max_amount}`
                    if (!formikRef.current.getFieldMeta("amount").touched)
                        amountRef?.current?.focus()
                }
                else if (amount < values.currency?.baseObject.min_amount) {
                    errors.amount = `Min amount is ${values.currency?.baseObject.min_amount}`
                    if (!formikRef.current.getFieldMeta("amount").touched)
                        amountRef?.current?.focus()
                }

                return errors;
            }}
            onSubmit={handleSubmit}
        >
            {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                <Form className="h-full">
                    <div className="px-8 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex flex-col justify-between w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0 mb-3.5 leading-4">
                                <div className="flex flex-col md:w-80 w-full">
                                    {
                                        <ExchangesField ref={exchangeRef} />
                                    }
                                </div>
                                <div className="flex flex-col md:w-80 w-full">
                                    {
                                        <NetworkField ref={networkRef} />
                                    }
                                </div>

                            </div>
                            <div className="w-full mb-3.5 leading-4">
                                <label htmlFor="destination_address" className="block font-normal text-pink-primary-300 text-sm">
                                    {`To ${values?.network?.name || ''} address`}
                                    {isPartnerWallet && <span className='truncate text-sm text-indigo-200'>({availablePartners[addressSource].name})</span>}
                                </label>
                                <div className="relative rounded-md shadow-sm mt-1.5">
                                    {isPartnerWallet &&
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Image className='rounded-md object-contain' src={availablePartners[addressSource].logo_url} width="24" height="24"></Image>
                                        </div>
                                    }
                                    <div>
                                        <Field name="destination_address">
                                            {({ field }) => (
                                                <input
                                                    {...field}
                                                    ref={addressRef}
                                                    placeholder={"0x123...ab56c"}
                                                    autoCorrect="off"
                                                    type={"text"}
                                                    name="destination_address"
                                                    id="destination_address"
                                                    disabled={initialAddress != '' && lockAddress || (!values.network || !values.exchange)}
                                                    className={joinClassNames(isPartnerWallet ? 'pl-11' : '', 'disabled:cursor-not-allowed h-12 leading-4 focus:ring-pink-primary focus:border-pink-primary block font-semibold w-full bg-darkblue-600 border-ouline-blue border rounded-md placeholder-gray-400 truncate')}
                                                />
                                            )}
                                        </Field>
                                    </div>

                                </div>
                            </div >
                            <div className="mb-6 leading-4">
                                <AmountField ref={amountRef} />
                            </div>

                            <div className="w-full">
                                <AmountAndFeeDetails amount={values?.amount} currency={values.currency?.baseObject} exchange={values.exchange?.baseObject} />
                            </div>
                        </div>
                        <div className="mt-6">
                            <SwapButton type='submit' isDisabled={errors.amount != null || errors.destination_address != null} isSubmitting={loading}>
                                {displayErrorsOrSubmit(errors)}
                            </SwapButton>
                        </div>
                    </div >
                </Form >
            )}
        </Formik >
    </>
}

function displayErrorsOrSubmit(errors: FormikErrors<SwapFormValues>): string {
    if (errors.amount) {
        return errors.amount;
    }
    else {
        return "Swap now";
    }
}

function joinClassNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}