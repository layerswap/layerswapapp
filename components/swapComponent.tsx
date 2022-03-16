import React, { useState } from 'react';
import { Formik, Form, Field, FormikErrors, useFormikContext } from 'formik';
import { FC } from 'react'
import axios from 'axios';
import { useRouter } from 'next/router'
import { CryptoNetwork } from '../Models/CryptoNetwork';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import CardContainer from './cardContainer';
import InsetSelectMenu from './selectMenu/insetSelectMenu';
import { SwitchHorizontalIcon } from '@heroicons/react/outline';
import SpinIcon from './icons/spinIcon';
import { isValidAddress } from '../lib/etherAddressValidator';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { Currency } from '../Models/Currency';
import { Exchange } from '../Models/Exchange';
import GetLogoByProjectName from '../lib/logoPathResolver';
import { SelectMenuItem } from './selectMenu/selectMenuItem';
import SelectMenu from './selectMenu/selectMenu';
import IntroCard from './introCard';
import Image from 'next/image'
import OffRampDetailsModal from './offRampDetailsModal';
import { SwapInfo } from '../Models/SwapInfo';
import { isValidEmailAddress } from '../lib/emailAddressValidator';

interface SwapFormValues {
  amount: string;
  destination_address: string;
  network: SelectMenuItem<CryptoNetwork>;
  currency: SelectMenuItem<Currency>;
  exchange: SelectMenuItem<Exchange>;
}

interface SwapApiResponse {
  swap_id: string;
  redirect_url: string;
}

interface SwapProps {
  settings: LayerSwapSettings;
  destNetwork?: string;
  destAddress?: string;
  lockAddress?: boolean;
  lockNetwork?: boolean;
  addressSource?: string;
  sourceExchangeName?: string;
  asset?: string;
  swapMode: string
}

interface PartnerInfo {
  name: string;
  logoSrc: string;
}

const partners: { [key: string]: PartnerInfo } = {
  "argent": {
    name: "Argent",
    logoSrc: "/logos/argent_wallet.png"
  },
  "imtoken": {
    name: "imToken",
    logoSrc: "/logos/imtoken_wallet.png"
  }
};

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
  isOfframp: boolean;
}

const ExchangesField: FC<ExchangesFieldProps> = ({ availableExchanges, label, isOfframp }) => {
  const {
    values: { exchange, currency },
    setFieldValue
  } = useFormikContext<SwapFormValues>();

  let filteredExchanges: SelectMenuItem<Exchange>[] = [];

  availableExchanges.map(function (exchange) {
    currency.baseObject.exchanges.map(function (currencyExchange) {
      if (exchange.baseObject.id === currencyExchange.exchangeId) {
        if (!isOfframp || currencyExchange.isOffRampEnabled)
          filteredExchanges.push(exchange);
      }
    })
  })

  return (<>
    <Field name="exchange" values={filteredExchanges} label={label} value={exchange} as={SelectMenu} setFieldValue={setFieldValue} />
  </>)
};

const Swap: FC<SwapProps> = ({ settings, destNetwork, destAddress, lockAddress, lockNetwork, addressSource, sourceExchangeName, asset, swapMode }) => {
  const router = useRouter();
  let isOfframp = swapMode == "offramp";

  let availableCurrencies = settings.currencies
    .map(c => new SelectMenuItem<Currency>(c, c.id, c.asset, GetLogoByProjectName(c.asset), c.is_enabled, c.is_default))
    .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));
  let availableExchanges = settings.exchanges
    .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.name, GetLogoByProjectName(c.internal_name), c.is_enabled, c.is_default))
    .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));
  let availableNetworks = settings.networks
    .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, GetLogoByProjectName(c.code), c.is_enabled, c.is_default))
    .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault)));

  if (isOfframp) {
    availableCurrencies = availableCurrencies.filter(x => x.baseObject.exchanges.find(c => c.isOffRampEnabled));
    availableNetworks = availableNetworks.filter(n => availableCurrencies.find(c => c.baseObject.network_id == n.baseObject.id));
  }


  let isPartnerAddress = addressSource && partners[addressSource] && destAddress;

  let initialNetwork =
    availableNetworks.find(x => x.baseObject.code.toUpperCase() === destNetwork?.toUpperCase() && x.isEnabled)
    ?? availableNetworks.find(x => x.isEnabled);

  if (lockNetwork) {
    availableNetworks.forEach(x => {
      if (x != initialNetwork)
        x.isEnabled = false;
    });
  }

  let initialAddress = destAddress && isValidAddress(destAddress, initialNetwork?.baseObject) ? destAddress : "";
  const enabledNetworkCurrencies = availableCurrencies.filter(x => x.baseObject.network_id === initialNetwork.baseObject.id && x.isEnabled);
  const initialCurrency = enabledNetworkCurrencies.find(x => x.baseObject.asset.toLowerCase() === asset?.toLowerCase()) ?? enabledNetworkCurrencies.find(x => x.isDefault);

  let initialExchange = availableExchanges.find(x => x.baseObject.internal_name === sourceExchangeName?.toLowerCase());

  if (isOfframp) {
    initialExchange = availableExchanges.filter(e => initialCurrency.baseObject.exchanges.find(ce => ce.isOffRampEnabled && ce.exchangeId == e.baseObject.id))[0]
  }

  if (!initialExchange || !initialCurrency.baseObject.exchanges.find(x => x.exchangeId === initialExchange.baseObject.id)) {
    initialExchange = availableExchanges.find(x => x.isEnabled && x.isDefault);
  }
  const initialValues: SwapFormValues = { amount: '', network: initialNetwork, destination_address: initialAddress, currency: initialCurrency, exchange: initialExchange };

  // Offramp modal stuff
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [offRampAddress, setoffRampAddress] = useState("");
  const [offRampMemo, setoffRampMemo] = useState("");
  const [offRampAmount, setoffRampAmount] = useState("");
  const [createdSwapId, setcreatedSwapId] = useState("");

  function onOffRampModalDismiss() {
    if (confirm("Are you sure you want to cancel?")) {
      setIsModalOpen(false);
    }
  }

  function onOffRampModalConfirm() {
    setIsModalOpen(false);
    router.push(`/${createdSwapId}`);
  }

  return (
    <div>
      <OffRampDetailsModal address={offRampAddress} memo={offRampMemo} amount={offRampAmount} isOpen={isModalOpen} onConfirm={onOffRampModalConfirm} onDismiss={onOffRampModalDismiss} />
      <div className="flex justify-center text-white">
        <div className="flex flex-col justify-center justify-items-center px-2">
          <CardContainer className="container mx-auto sm:px-6 lg:px-8 max-w-3xl">
            <Formik
              enableReinitialize={true}
              initialValues={initialValues}
              validate={values => {
                let errors: FormikErrors<SwapFormValues> = {};
                let amount = Number(values.amount?.toString()?.replace(",", "."));
                if (!amount) {
                  errors.amount = 'Enter an amount';
                }
                else if (
                  !/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())
                ) {
                  errors.amount = 'Invalid amount';
                }
                else if (amount < 0) {
                  errors.amount = "Can't be negative";
                }
                else if (amount > values.currency.baseObject.max_amount) {
                  errors.amount = `Max amount is ${values.currency.baseObject.max_amount}`;
                }
                else if (amount < values.currency.baseObject.min_amount) {
                  errors.amount = `Min amount is ${values.currency.baseObject.min_amount}`;
                }

                if (!values.destination_address) {
                  errors.destination_address = "Enter a destination address"
                }
                else {
                  if (isOfframp) {
                    if (!isValidEmailAddress(values.destination_address)) {
                      errors.destination_address = "Enter a valid email address"
                    }
                  }
                  else if (!isValidAddress(values.destination_address, values.network.baseObject)) {
                    errors.destination_address = "Enter a valid destination address"
                  }
                }

                return errors;
              }}
              onSubmit={(values, actions) => {
                axios.post<SwapApiResponse>(
                  LayerSwapApiClient.apiBaseEndpoint + "/swaps",
                  {
                    amount: Number(values.amount?.toString()?.replace(",", ".")),
                    currency: values.currency.name,
                    destination_address: values.destination_address,
                    network: values.network.id,
                    exchange: values.exchange.id,
                    partner_name: isPartnerAddress ? partners[addressSource].name : undefined,
                    to_exchange: isOfframp
                  }
                )
                  .then(response => {
                    if (isOfframp) {

                      axios.get<SwapInfo>(LayerSwapApiClient.apiBaseEndpoint + `/swaps/${response.data.swap_id}`)
                        .then(r => {
                          setoffRampAddress(r.data.offramp_info.deposit_address);
                          setoffRampMemo(r.data.offramp_info.memo);
                          setoffRampAmount(r.data.amount.toLocaleString());
                          setcreatedSwapId(r.data.id);

                          setIsModalOpen(true);
                        });
                    }
                    else {
                      router.push(response.data.redirect_url);
                    }

                    actions.setSubmitting(false);
                  })
                  .catch(error => {
                    actions.setSubmitting(false);
                  });
              }}
            >
              {({ values, setFieldValue, errors, isSubmitting, handleChange }) => (
                <Form>
                  <div className="px-0 md:px-6 py-0 md:py-2">
                    <div className="flex flex-col justify-between w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                      <div className="w-full">
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
                      <div className="flex flex-col md:w-3/5 w-full">
                        {
                          isOfframp ? <Field name="network" values={availableNetworks} label={isOfframp ? "From Network" : "To Network"} value={values.network} as={SelectMenu} setFieldValue={setFieldValue} />
                            : <ExchangesField isOfframp={isOfframp} label={isOfframp ? "To Exchange" : "From Exchange"} availableExchanges={availableExchanges} />
                        }
                      </div>
                    </div>
                    <div className="mt-5 flex flex-col justify-between items-center w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                      <div className="w-full">
                        <label className="block font-medium text-base">
                          Address  {isPartnerAddress && `(Your ${partners[addressSource].name} wallet)`}
                        </label>
                        <div className="relative rounded-md shadow-sm mt-1">
                          {isPartnerAddress &&
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Image className='rounded-md object-contain' src={partners[addressSource].logoSrc} width="24" height="24"></Image>
                            </div>
                          }
                          <div>
                            <Field name="destination_address">
                              {({ field }) => (
                                <input
                                  {...field}
                                  placeholder={isOfframp ? "mycoinbase@gmail.com" : "0x123...ab56c"}
                                  autoCorrect="off"
                                  type={isOfframp ? "email" : "text"}
                                  name="destination_address"
                                  id="destination_address"
                                  disabled={initialAddress != '' && lockAddress}
                                  className={joinClassNames(isPartnerAddress ? 'pl-11' : '', 'focus:ring-indigo-500 focus:border-indigo-500 block font-semibold w-full bg-gray-800 border-gray-600 rounded-md placeholder-gray-400 truncate disabled:bg-gray-600')}
                                />
                              )}
                            </Field>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col md:w-3/5 w-full">
                        {
                          isOfframp ? <ExchangesField isOfframp={isOfframp} label={isOfframp ? "To Exchange" : "From Exchange"} availableExchanges={availableExchanges} />
                            : <Field name="network" values={availableNetworks} label={isOfframp ? "From Network" : "To Network"} value={values.network} as={SelectMenu} setFieldValue={setFieldValue} />
                        }
                      </div>
                    </div>
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
                      <button
                        disabled={errors.amount != null || errors.destination_address != null || isSubmitting}
                        type="submit"
                        className={controlDisabledButton(errors, isSubmitting)}
                      >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                          {(errors.amount == null && errors.destination_address == null && !isSubmitting) &&
                            <SwitchHorizontalIcon className="h-5 w-5" aria-hidden="true" />}
                          {isSubmitting ?
                            <SpinIcon className="animate-spin h-5 w-5" />
                            : null}
                        </span>
                        {displayErrorsOrSubmit(errors)}
                      </button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </CardContainer >
          <IntroCard className="container mx-auto sm:px-6 lg:px-8 max-w-3xl pt-5" />
        </div>
      </div>
    </div>
  )
};

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

function controlDisabledButton(errors: FormikErrors<SwapFormValues>, isSubmitting: boolean): string {
  let defaultStyles = 'group relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
  if (errors.amount != null || errors.destination_address != null || isSubmitting) {
    defaultStyles += ' bg-gray-500 cursor-not-allowed';
  }
  else {
    defaultStyles += ' bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out'
  }

  return defaultStyles;
}

function calculateFee(values: SwapFormValues): number {
  let currencyObject = values.currency.baseObject;
  let exchangeObject = values.exchange.baseObject;

  var exchangeFee = Number(values.amount?.toString()?.replace(",", ".")) * exchangeObject.fee_percentage;
  var overallFee = currencyObject.fee + exchangeFee;

  return overallFee;
}

export default Swap;