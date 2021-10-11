import React from 'react';
import { Formik, Form, Field, FormikErrors, useFormikContext, useField } from 'formik';
import { FC } from 'react'
import axios from 'axios';
import { useRouter } from 'next/router'
import { CryptoNetwork } from '../../Models/CryptoNetwork';
import LayerSwapApiClient from '../../lib/layerSwapApiClient';
import CardContainer from '../cardContainer';
import InsetSelectMenu from '../insetSelectMenu';
import { BookOpenIcon, PlayIcon, SwitchHorizontalIcon } from '@heroicons/react/outline';
import SpinIcon from '../icons/spinIcon';
import { isValidEtherAddress } from '../../lib/etherAddressValidator';
import { SelectMenuItem } from '../utils/selectMenuItem';
import SelectMenu from '../selectMenu';
import SmallCardContainer from '../smallCardContainer';
import TwitterLogo from '../icons/twitterLogo';
import DiscordLogo from '../icons/discordLogo';
import Link from 'next/link';
import { LayerSwapSettings } from '../../Models/LayerSwapSettings';
import { Currency } from '../../Models/Currency';
import { Exchange } from '../../Models/Exchange';
import GetLogoByProjectName from '../../lib/logoPathResolver';

interface SwapFormValues {
  amount: string;
  destination_address: string;
  network: SelectMenuItem<CryptoNetwork>;
  currency: SelectMenuItem<Currency>;
  exchange: SelectMenuItem<Exchange>;
}

interface SwapApiResponse {
  swapId: string;
  redirect_url: string;
}

interface SwapProps {
  settings: LayerSwapSettings;
}

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

const Swap: FC<SwapProps> = ({ settings }) => {
  const router = useRouter()
  let availableCurrencies = settings.currencies
    .map(c => new SelectMenuItem<Currency>(c, c.id, c.asset, GetLogoByProjectName(c.asset), c.is_enabled))
    .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled));
  const availableExchanges = settings.exchanges
    .map(c => new SelectMenuItem<Exchange>(c, c.internal_name, c.name, GetLogoByProjectName(c.name), c.is_enabled))
    .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled));
  const availableNetworks = settings.networks
    .map(c => new SelectMenuItem<CryptoNetwork>(c, c.code, c.name, GetLogoByProjectName(c.code), c.is_enabled))
    .sort((x, y) => Number(y.isEnabled) - Number(x.isEnabled));
  const initialNetwork = availableNetworks.find(x => x.isEnabled);
  const initialExchange = availableExchanges.find(x => x.isEnabled);
  const initialCurrency = availableCurrencies.find(x => x.baseObject.network_id === initialNetwork.baseObject.id && x.isEnabled);

  const initialValues: SwapFormValues = { amount: '', network: initialNetwork, destination_address: "", currency: initialCurrency, exchange: initialExchange };
  return (
    <div className="flex justify-center">
      <div className="flex flex-col justify-center justify-items-center pt-10 px-2">
        <CardContainer className="w-full">
          <Formik
            initialValues={initialValues}
            validate={values => {
              let errors: FormikErrors<SwapFormValues> = {};
              let amount = Number(values.amount);
              if (!values.amount) {
                errors.amount = 'Enter an amount';
              }
              else if (
                !/^[0-9]*[.,]?[0-9]*$/i.test(values.amount.toString())
              ) {
                errors.amount = 'Invalid amount';
              }
              else if (amount < 0) {
                errors.amount = "Can't be negative";
              }
              else if (amount > 500) {
                errors.amount = "Amount should be less than 500";
              }
              else if (amount < 10) {
                errors.amount = "Amount should be at least 10";
              }

              if (!values.destination_address) {
                errors.destination_address = "Enter a destination address"
              }
              else if (!isValidEtherAddress(values.destination_address)) {
                errors.destination_address = "Enter a valid destination address"
              }

              return errors;
            }}
            onSubmit={(values, actions) => {
              axios.post<SwapApiResponse>(
                LayerSwapApiClient.apiBaseEndpoint + "/swaps",
                {
                  amount: values.amount,
                  currency: values.currency.name,
                  destination_address: values.destination_address,
                  network: values.network.id,
                  exchange: values.exchange.id
                }
              )
                .then(response => {
                  router.push(response.data.redirect_url);
                })
                .catch(error => {
                  actions.setSubmitting(false);
                });

            }}
          >
            {({ values, setFieldValue, errors, isSubmitting }) => (
              <Form>
                <div className="px-0 md:px-6 py-0 md:py-2">
                  <div className="flex flex-col justify-between w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                    <div className="w-full">
                      <Field name="amount">
                        {({ field }) => (
                          <div>
                            <label htmlFor="amount" className="block text-base font-medium text-gray-700">
                              Send
                            </label>
                            <div className="relative rounded-md shadow-sm">
                              <input
                                {...field}
                                pattern="^[0-9]*[.,]?[0-9]*$"
                                inputMode="decimal"
                                autoComplete="off"
                                placeholder="0.0"
                                step="0.01"
                                autoCorrect="off"
                                min="10"
                                max="500"
                                type="number"
                                name="amount"
                                id="amount"
                                className="focus:ring-indigo-500 focus:border-indigo-500 pr-36 block w-full font-semibold text-gray-700 border-gray-300 rounded-md placeholder-gray-400"
                                onKeyPress={e => {
                                  const regex = /^[0-9]*[.,]?[0-9]*$/;
                                  if (!regex.test(e.key)) {
                                    return e.preventDefault();
                                  }
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
                    <div className="flex flex-col md:w-2/4 w-full">
                      <Field name="exchange" values={availableExchanges} label="From" value={values.exchange} as={SelectMenu} setFieldValue={setFieldValue} />
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col justify-between items-center w-full md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                    <div className="w-full">
                      <label className="block font-medium text-gray-700">
                        To
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <Field name="destination_address">
                          {({ field }) => (
                            <input
                              {...field}
                              placeholder="0x123...ab56c"
                              autoCorrect="off"
                              type="text"
                              name="destination_address"
                              id="destination_address"
                              className="focus:ring-indigo-500 focus:border-indigo-500 block font-semibold text-gray-700 w-full border-gray-300 rounded-md placeholder-gray-400 truncate"
                            />
                          )}
                        </Field>

                      </div>
                    </div>
                    <div className="flex flex-col md:w-2/4 w-full">
                      <Field name="network" values={availableNetworks} label="In" value={values.network} as={SelectMenu} setFieldValue={setFieldValue} />
                    </div>
                  </div>
                  <div className="mt-5">
                    <label className="block font-medium text-gray-700">
                      Estimated received
                    </label>
                    <p className="text-indigo-500 text-lg font-medium">
                      {(() => {
                        if (values.amount) {
                          let amount = Number(values.amount);
                          if (amount >= 10) {
                            return amount - 3 - (amount * 5 / 100);
                          }
                        }

                        return 0;
                      })()}
                      <span className="text-gray-700">  {values.currency.name}</span></p>
                  </div>
                  <div className="mt-10">
                    <button
                      disabled={errors.amount != null || errors.destination_address != null || isSubmitting}
                      type="submit"
                      className={controlDisabledButton(errors, isSubmitting)}
                    >
                      <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                        {(errors.amount == null && errors.destination_address == null && !isSubmitting) &&
                          <SwitchHorizontalIcon className="h-5 w-5 text-white" aria-hidden="true" />}
                        {isSubmitting ?
                          <SpinIcon className="animate-spin h-5 w-5 text-white" />
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
        <SmallCardContainer className="w-full pt-5">
          <div className="flex flex-col md:flex-row md:space-x-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">LayerSwap</h1>
              <p className="md:max-w-xs text-base text-gray-700 mt-2">
                Save 10x on fees when moving crypto from Coinbase or Binance to Arbitrum
              </p>
              <div className="mt-2 md:space-x-5 flex flex-col md:flex-row">
                <Link key="userGuide" href="/userguide">
                  <a className="text-indigo-700 font-semibold hover:underline hover:cursor-pointer">
                    <div className="flex flex-row items-center">
                      <BookOpenIcon className="w-5 h-5 mr-2" />
                      <span>User Guide</span>
                    </div>
                  </a>
                </Link>
                <a href="https://twitter.com/layerswap" target="_blank" className="text-indigo-700 font-semibold hover:underline hover:cursor-pointer">
                  <div className="flex flex-row items-center">
                    <TwitterLogo className="w-5 h-5 mr-2" />
                    <span>Twitter</span>
                  </div>
                </a>

                <a href="https://discord.com/invite/KhwYN35sHy" target="_blank" className="text-indigo-700 font-semibold hover:underline hover:cursor-pointer">
                  <div className="flex flex-row items-center">
                    <DiscordLogo className="w-5 h-5 mr-2" />
                    <span>Discord</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <div className="mt-3 md:mt-0">
                <a
                  target="_blank"
                  href="https://www.loom.com/share/c853ca7e2ed04fa986e35928e8da015b"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:px-10"
                >
                  <div className="flex flex-row items-center">

                    <PlayIcon className="w-5 h-5 mr-1" />
                    <span>Intro video</span>
                  </div>
                </a>

              </div>
            </div>
          </div>
        </SmallCardContainer>
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

function controlDisabledButton(errors: FormikErrors<SwapFormValues>, isSubmitting: boolean): string {
  let defaultStyles = 'group relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
  if (errors.amount != null || errors.destination_address != null || isSubmitting) {
    defaultStyles += ' bg-gray-500 cursor-not-allowed';
  }
  else {
    defaultStyles += ' bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out'
  }

  return defaultStyles;
}

export default Swap;