import { Web3Provider } from "@ethersproject/providers";
import { ImmutableXClient } from "@imtbl/imx-sdk";
import { useWeb3React } from "@web3-react/core";
import { Field, Form, Formik, FormikErrors, FormikProps, useFormikContext } from "formik";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useAccountState } from "../../../context/account";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { isValidAddress } from "../../../lib/etherAddressValidator";
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


const immutableXApiAddress = 'https://api.x.immutable.com/v1';

const CurrenciesField = (props) => {
    const {
        values: { network, currency },
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    let availableCurrencies = props.availableCurrencies.filter(x => x.baseObject.network_id == network.baseObject.id);
    return (<>
        <Field name="currency" values={availableCurrencies} value={currency} as={InsetSelectMenu} setFieldValue={setFieldValue} />
    </>)
};

interface ExchangesFieldProps {
    availableExchanges: SelectMenuItem<Exchange>[];
    label: string;
}

const ExchangesField: FC<ExchangesFieldProps> = ({ availableExchanges, label }) => {
    const {
        values: { exchange, currency },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    let filteredExchanges: SelectMenuItem<Exchange>[] = [];

    availableExchanges.map(function (exchange) {
        currency.baseObject.exchanges.map(function (currencyExchange) {
            if (exchange.baseObject.id === currencyExchange.exchangeId) {
                filteredExchanges.push(exchange);
            }
        })
    })

    return (<>
        <Field name="exchange" values={filteredExchanges} label={label} value={exchange} as={SelectMenu} setFieldValue={setFieldValue} />
    </>)
};


export default function MainStep() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const { nextStep } = useWizardState();

    let formValues = formikRef.current?.values;

    const settings = useSettingsState();
    const query = useQueryState();
    const [addressSource, setAddressSource] = useState("")
    const { updateSwap } = useSwapDataUpdate()

    useEffect(() => {
        let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
        let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;
        setAddressSource((isImtoken && 'imtoken') || (isTokenPocket && 'tokenpocket') || query.addressSource)
    }, [query])

    const { account, chainId } = useAccountState();

    let availableCurrencies = settings.currencies
        .map(c => new SelectMenuItem<Currency>(c, c.id, c.asset, c.logo_url, c.is_enabled, c.is_default))
        .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));
    let availableExchanges = settings.exchanges
        .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.name, c.logo_url, c.is_enabled, c.is_default))
        .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));
    let availableNetworks = settings.networks
        .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, c.logo_url, c.is_enabled, c.is_default))
        .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));

    const availablePartners = Object.fromEntries(settings.partners.map(c => [c.name.toLowerCase(), new SelectMenuItem<Partner>(c, c.name, c.display_name, c.logo_url, c.is_enabled)]));

    const handleSubmit = useCallback(async (values) => {
        await updateSwap(values)
        nextStep()
        // if (values.network.baseObject.code.toLowerCase().includes("immutablex")) {
        //     ImmutableXClient.build({ publicApiUrl: immutableXApiAddress })
        //         .then(client => {
        //             client.isRegistered({ user: values.destination_address })
        //                 .then(isRegistered => {
        //                     // if (isRegistered) {
        //                     //     setIsConfirmModalOpen(true);
        //                     // }
        //                     // else {
        //                     //     setIsImmutableModalOpen(true);
        //                     // }
        //                 })
        //         })
        // }
        // else {
        //     // setIsConfirmModalOpen(true);
        // }
    }, [updateSwap])

    let destAddress: string = account || query.destAddress;
    let destNetwork: string = (chainId && settings.networks.find(x => x.chain_id == chainId)?.code) || query.destNetwork;


    let isPartnerAddress = addressSource && availablePartners[addressSource] && destAddress;
    let isPartnerWallet = isPartnerAddress && availablePartners[addressSource].baseObject.is_wallet;
    let initialNetwork =
        availableNetworks.find(x => x.baseObject.code.toUpperCase() === destNetwork?.toUpperCase() && x.isEnabled)
        ?? availableNetworks.find(x => x.isEnabled && x.isDefault);

    const lockNetwork = !!chainId
    const asset = query.asset
    const sourceExchangeName = query.sourceExchangeName
    const lockAddress = !!account || query.lockAddress

    if (lockNetwork) {
        availableNetworks.forEach(x => {
            if (x != initialNetwork)
                x.isEnabled = false;
        });
    }

    let initialAddress = destAddress && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";

    const enabledNetworkCurrencies = availableCurrencies.filter(x => x.baseObject.network_id === initialNetwork.baseObject.id && x.isEnabled);
    const initialCurrency = enabledNetworkCurrencies.find(x => x.baseObject.asset.toLowerCase() === asset?.toLowerCase()) ?? enabledNetworkCurrencies.find(x => x.isDefault) ?? enabledNetworkCurrencies[0];
    let initialExchange = availableExchanges.find(x => x.baseObject.internal_name === sourceExchangeName?.toLowerCase());

    if (!initialExchange || !initialCurrency.baseObject.exchanges.find(x => x.exchangeId === initialExchange.baseObject.id)) {
        initialExchange = availableExchanges.find(x => x.isEnabled && x.isDefault);
    }
    const initialValues: SwapFormValues = { amount: '', network: initialNetwork, destination_address: initialAddress, currency: initialCurrency, exchange: initialExchange };

    return <>
        <Formik
            enableReinitialize={true}
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={values => {
                // let errors: FormikErrors<SwapFormValues> = {};
                // let amount = Number(values.amount?.toString()?.replace(",", "."));
                // if (!amount) {
                //     errors.amount = 'Enter an amount';
                // }
                // else if (
                //     !/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())
                // ) {
                //     errors.amount = 'Invalid amount';
                // }
                // else if (amount < 0) {
                //     errors.amount = "Can't be negative";
                // }
                // else if (amount > values.currency.baseObject.max_amount) {
                //     errors.amount = `Max amount is ${values.currency.baseObject.max_amount}`;
                // }
                // else if (amount < values.currency.baseObject.min_amount) {
                //     errors.amount = `Min amount is ${values.currency.baseObject.min_amount}`;
                // }

                // if (!values.destination_address) {
                //     errors.destination_address = `Enter ${values?.network.name} address`
                // }
                // else if (!isValidAddress(values.destination_address, values.network.baseObject)) {
                //     errors.destination_address = `Enter a valid ${values?.network.name} address`
                // }

                // return errors;
            }}
            onSubmit={handleSubmit}
        >
            {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                <Form>
                    <Select items={availableExchanges}/>
                    <div className="px-6 md:px-12 py-12">
                        <div className="flex flex-col justify-between w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                            
                            <div className="flex flex-col md:w-80 w-full">
                                {
                                    <ExchangesField label={"From"} availableExchanges={availableExchanges} />}
                            </div>
                            <div className="flex flex-col md:w-80 w-full">
                                {
                                    <Field name="network" values={availableNetworks} label={"To"} value={values.network} as={SelectMenu} setFieldValue={setFieldValue} />
                                }
                            </div>
                        </div>
                        <div className="mt-5 flex flex-col justify-between items-center w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                            <div className="w-full">
                                <label className="block font-medium text-base">
                                    {`To ${values?.network?.name} address`}
                                    {isPartnerWallet && <span className='truncate text-sm text-indigo-200'>({availablePartners[addressSource].name})</span>}
                                </label>
                                <div className="relative rounded-md shadow-sm mt-1">
                                    {isPartnerWallet &&
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Image className='rounded-md object-contain' src={availablePartners[addressSource].imgSrc} width="24" height="24"></Image>
                                        </div>
                                    }
                                    <div>
                                        <Field name="destination_address">
                                            {({ field }) => (
                                                <input
                                                    {...field}
                                                    placeholder={"0x123...ab56c"}
                                                    autoCorrect="off"
                                                    type={"text"}
                                                    name="destination_address"
                                                    id="destination_address"
                                                    disabled={initialAddress != '' && lockAddress}
                                                    className={joinClassNames(isPartnerWallet ? 'pl-11' : '', 'focus:ring-indigo-500 focus:border-indigo-500 block font-semibold w-full bg-gray-800 border-gray-600 rounded-md placeholder-gray-400 truncate disabled:bg-gray-600')}
                                                />
                                            )}
                                        </Field>
                                    </div>
                                </div>
                            </div >

                            <div className="">
                                <Field name="amount">
                                    {({ field }) => (
                                        <div>
                                            <label htmlFor="amount" className="block text-base font-medium">
                                                Amount
                                            </label>
                                            <div className="relative rounded-md shadow-sm mt-1">
                                                <input
                                                    {...field}
                                                    pattern="^[0-9]*[.,]?[0-9]*$"
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    placeholder={`${values.currency.baseObject.min_amount} - ${values.currency.baseObject.max_amount}`}
                                                    autoCorrect="off"
                                                    min={values.currency.baseObject.min_amount}
                                                    max={values.currency.baseObject.max_amount}
                                                    type="text"
                                                    step={1 / Math.pow(10, values.currency.baseObject.decimals)}
                                                    name="amount"
                                                    id="amount"
                                                    className="focus:ring-indigo-500 focus:border-indigo-500 pr-36 block bg-gray-800 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                                                    onChange={e => {
                                                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e)
                                                    }}
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center">
                                                    <CurrenciesField name="currency" availableCurrencies={availableCurrencies} value={values.currency} as={InsetSelectMenu} setFieldValue={setFieldValue} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Field>
                            </div>
                        </div >
                        <div className="mt-5 flex flex-col md:flex-row items-baseline justify-between">
                            <label className="block font-medium text-center">
                                Fee
                            </label>
                            <span className="text-base font-medium text-center text-gray-400">
                                {(() => calculateFee(values).toFixed(values.currency.baseObject.precision))()}
                                <span>  {values.currency.name} </span>
                            </span>
                        </div>
                        <div className="mt-2 flex flex-col md:flex-row items-baseline justify-between">
                            <label className="block font-medium text-center">
                                You will get
                            </label>
                            <span className="text-indigo-300 text-lg font-medium text-center">
                                {(() => {
                                    if (values.amount) {
                                        let amount = Number(values.amount?.toString()?.replace(",", "."));
                                        let currencyObject = values.currency.baseObject;
                                        if (amount >= currencyObject.min_amount) {
                                            var fee = calculateFee(values);
                                            var result = amount - fee;
                                            return Number(result.toFixed(currencyObject.precision));
                                        }
                                    }

                                    return 0;
                                })()}
                                <span>  {values.currency.name}</span></span>
                        </div>
                        <div className="mt-10">
                            <SwapButton type='submit' isDisabled={errors.amount != null || errors.destination_address != null} isSubmitting={false}>
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
    else if (errors.destination_address) {
        return errors.destination_address;
    }
    else {
        return "Swap now";
    }
}

function joinClassNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

function calculateFee(values: SwapFormValues): number {
    let currencyObject = values.currency.baseObject;
    let exchangeObject = values.exchange.baseObject;

    var exchangeFee = Number(values.amount?.toString()?.replace(",", ".")) * exchangeObject.fee_percentage;
    var overallFee = currencyObject.fee + exchangeFee;

    return overallFee;
}