import React from 'react';
import { Formik, Form, Field, FormikErrors } from 'formik';
import axios from 'axios';
import { useRouter } from 'next/router'
import { CryptoNetwork } from '../../Models/CryptoNetwork';
import LayerSwapApiClient from '../../layerSwapApiClient';
import CardContainer from '../cardContainer';
import SelectMenu, { SelectMenuItem } from '../selectMenu';
import { SwitchHorizontalIcon } from '@heroicons/react/solid';
import SpinIcon from '../icons/spinIcon';

interface SwapFormValues {
  amount: string;
  destination_address: string;
  network: SelectMenuItem;
  currency: SelectMenuItem;
}

interface SwapApiResponse {
  swapId: string;
  redirect_url: string;
}

function Swap() {
  const router = useRouter()
  const availableCurrencies: SelectMenuItem[] = [
    new SelectMenuItem("USDT", "USDT", '/tether-usdt-logo.png'),
    new SelectMenuItem("USDC", "USDC", '/usd-coin-usdc-logo.png', false)
  ];

  let addressValue = '';
  function handleOnFocusOut(field: any, setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void) {
    addressValue = field.value;
    if (addressValue.length > 10) {
      setFieldValue("destination_address", addressValue.substr(0, 5) + "..." + addressValue.substr(addressValue.length - 5))
    }
  }

  function handleOnFocus(setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void) {
    setFieldValue("destination_address", addressValue)
  }

  const availableNetworks: SelectMenuItem[] = CryptoNetwork.layerTwos.map(ltwo => new SelectMenuItem(ltwo.name, ltwo.displayName, ltwo.imgSrc));
  const initialValues: SwapFormValues = { amount: '', network: availableNetworks[0], destination_address: "", currency: availableCurrencies[0] };
  return (
    <CardContainer>
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

          return errors;
        }}
        onSubmit={(values, actions) => {
          axios.post<SwapApiResponse>(
            LayerSwapApiClient.apiBaseEndpoint + "/swaps",
            {
              amount: values.amount,
              currency: values.currency.id,
              destination_address: addressValue,
              network: values.network.id
            }
          )
            .then(response => {
              let result: SwapApiResponse = response.data;
              router.push(response.data.redirect_url);
              actions.setSubmitting(false);
            })
            .catch(error => {
              actions.setSubmitting(false);
            });

        }}
      >
        {({ values, setFieldValue, errors, isSubmitting, handleBlur }) => (
          <Form>
            <div className="overflow-hidden">
              <div className="p-0 sm:p-6">
                <Field name="amount">
                  {({ field }) => (
                    <div>
                      <label htmlFor="amount" className="block text-base font-medium text-gray-700">
                        Send
                      </label>
                      <div className="">
                        <div className="relative rounded-md shadow-sm">
                          <input
                            {...field}
                            pattern="^[0-9]*[.,]?[0-9]*$"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0.0"
                            step="1"
                            autoCorrect="off"
                            min="10"
                            max="500"
                            type="number"
                            name="amount"
                            id="amount"
                            className="focus:ring-indigo-500 focus:border-indigo-500 pr-36 block w-full font-semibold text-gray-700 border-gray-300 rounded-md placeholder-gray-400"
                            onKeyDown={e => {
                              if (!((e.keyCode > 95 && e.keyCode < 106)
                                || (e.keyCode >= 46 && e.keyCode < 58)
                                || e.keyCode == 8
                                || e.keyCode == 37 || e.keyCode == 39 || e.keyCode == 190
                                || e.keyCode == 9 || e.keyCode == 13 || e.keyCode == 110)) {
                                return e.preventDefault();
                              }
                            }}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center">
                            <Field name="currency" values={availableCurrencies} value={values.currency} as={SelectMenu} setFieldValue={setFieldValue} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Field>
                <div className="mt-5">
                  <label className="block font-medium text-gray-700">
                    To
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <Field name="destination_address">
                      {({ field }) => (
                        <input
                          {...field}
                          onBlur={e => { handleBlur(e); handleOnFocusOut(field, setFieldValue) }}
                          onFocus={e => handleOnFocus(setFieldValue)}
                          placeholder="0x123...ab56c"
                          autoCorrect="off"
                          type="text"
                          name="destination_address"
                          id="destination_address"
                          className="focus:ring-indigo-500 focus:border-indigo-500 block font-semibold text-gray-700 pr-44 w-full border-gray-300 rounded-md placeholder-gray-400"
                        />
                      )}
                    </Field>
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <Field name="network" values={availableNetworks} value={values.network} as={SelectMenu} setFieldValue={setFieldValue} />
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <label className="block font-medium text-gray-700">
                    Estimated received
                  </label>
                  <p className="text-indigo-500 text-lg font-medium">{values.amount ? Number(values.amount) - Number(values.amount) * 5 / 100 : 0}<span className="text-gray-700">  {values.currency.name}</span></p>
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
            </div>
          </Form>
        )}
      </Formik>
    </CardContainer>
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