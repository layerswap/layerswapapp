import React from 'react';
import { Formik, Form, Field, ErrorMessage, FormikErrors } from 'formik';
import axios from 'axios';
import { useRouter } from 'next/router'
import { CryptoNetwork } from '../../Models/CryptoNetwork';
import LayerSwapApiClient from '../../layerSwapApiClient';
import CardContainer from '../cardContainer';
import SelectMenu, { SelectMenuItem } from '../selectMenu';
import usdcLogo from '../../public/usd-coin-usdc-logo.png';
import usdtLogo from '../../public/tether-usdt-logo.png';
import { SwitchHorizontalIcon } from '@heroicons/react/solid'

interface SwapFormValues {
  amount: number;
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
    new SelectMenuItem("USDC", "USDC", usdcLogo),
    new SelectMenuItem("USDT", "USDT", usdtLogo, false)
  ];
  const availableNetworks: SelectMenuItem[] = CryptoNetwork.layerTwos.map(ltwo => new SelectMenuItem(ltwo.name, ltwo.displayName, ltwo.imgSrc));
  const initialValues: SwapFormValues = { amount: undefined, network: availableNetworks[0], destination_address: "", currency: availableCurrencies[0] };
  return (
    <CardContainer>
      <Formik
        initialValues={initialValues}
        validate={values => {
          let errors: FormikErrors<SwapFormValues> = {};
          if (!values.amount) {
            errors.amount = 'Enter an amount';
          }
          else if (
            !/^[0-9]*[.,]?[0-9]*$/i.test(values.amount.toString())
          ) {
            errors.amount = 'Invalid amount';
          }
          else if (values.amount < 0) {
            errors.amount = "Can't be negative";
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
              destination_address: values.destination_address,
              network: values.network.id
            }
          )
            .then(response => {
              let result: SwapApiResponse = response.data;
              console.log(result);
              actions.setSubmitting(false);
              actions.resetForm();
              router.push(response.data.redirect_url);
            })
            .catch(error => {
              actions.setSubmitting(false);
            });

        }}
      >
        {({ values, setFieldValue, errors, isSubmitting }) => (
          <Form>
            <div className="overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <Field name="amount">
                  {({ field }) => (
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
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
                            step="any"
                            autoCorrect="off"
                            min="0"
                            type="number"
                            name="amount"
                            id="amount"
                            className="focus:ring-indigo-500 focus:border-indigo-500 pr-36 block w-full sm:text-sm border-gray-300 rounded-md"
                            onKeyDown={e => {
                              if (!((e.keyCode > 95 && e.keyCode < 106)
                                || (e.keyCode >= 46 && e.keyCode < 58)
                                || e.keyCode == 8
                                || e.keyCode == 37 || e.keyCode == 39 || e.keyCode == 190
                                || e.keyCode == 9 || e.keyCode == 13)) {
                                return e.preventDefault();
                              }
                            }}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center">
                            <Field name="network" values={availableCurrencies} value={values.currency} as={SelectMenu} setFieldValue={setFieldValue} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Field>
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700">
                    To
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <Field name="destination_address">
                      {({ field }) => (
                        <input
                          {...field}
                          placeholder="0x123ab56cd89"
                          autoCorrect="off"
                          type="text"
                          name="destination_address"
                          id="destination_address"
                          className="focus:ring-indigo-500 focus:border-indigo-500 block pr-40 w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      )}
                    </Field>
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <Field name="network" values={availableNetworks} value={values.network} as={SelectMenu} setFieldValue={setFieldValue} />
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <label className="block text-sm font-medium text-gray-700">
                    Estimated received
                  </label>
                  <p className="text-indigo-500 text-lg font-medium">{values.amount ? values.amount - values.amount * 5 / 100 : 0}<span className="text-gray-700">  {values.currency.name}</span></p>
                </div>
                <div className="mt-10">
                  <button
                    disabled={errors.amount != null || errors.destination_address != null || isSubmitting}
                    type="submit"
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      {(errors.amount == null && errors.destination_address == null && !isSubmitting) &&
                        <SwitchHorizontalIcon className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />}
                      {isSubmitting ?
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
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
    return "Swap";
  }
}

export default Swap;