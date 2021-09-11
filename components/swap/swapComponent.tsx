import React from 'react';
import { Formik, Form, Field, ErrorMessage, FormikErrors } from 'formik';
import axios from 'axios';
import { useRouter } from 'next/router'

interface SwapFormValues {
  amount: number;
  destinationAddress: string;
  network: string;
}

interface LayerTwoNetwork {
  name: string;
  displayName: string;
}

let layerTwos: LayerTwoNetwork[] = [
  {
    name: "POLYGON_MUMBAI",
    displayName: "POLYGON_MUMBAI"
  },
  {
    name: "ARBITRUM_MAINNET",
    displayName: "ARBITRUM_MAINNET"
  },
];

interface SwapApiResponse
{
  swapId:string;
  redirectUrl:string;
}

function Swap() {
  const router = useRouter()
  const initialValues: SwapFormValues = { amount: 0, network: layerTwos[0].name, destinationAddress: "" };
  return (<div>
    <Formik
      initialValues={initialValues}
      validate={values => {
        let errors: FormikErrors<SwapFormValues> = {};
        if (!values.amount) {
          errors.amount = 'Required';
        }
        else if (
          !/^[0-9]*[.,]?[0-9]*$/i.test(values.amount.toString())
        ) {
          errors.amount = 'Invalid amount';
        }

        if (!values.destinationAddress)
        {
          errors.destinationAddress = "Can't be empty"
        }

          return errors;
      }}
      onSubmit={(values, actions) => {
        axios.post<SwapApiResponse>(
          "https://bransfer-layer-swap.azurewebsites.net/api/swaps", values
        )
          .then(response => {
            let result: SwapApiResponse = response.data;
            console.log(result);
            actions.setSubmitting(false);
            actions.resetForm();
            router.push(response.data.redirectUrl);
          })
          .catch(error => {
            actions.setSubmitting(false);
          });

      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <Field type="number" name="amount" pattern="^[0-9]*[.,]?[0-9]*$" inputMode="decimal" autoComplete="off" placeholder="0.0" autoCorrect="off" minLength="1" maxLength="80" />
          <ErrorMessage name="amount" component="div" />
          <Field type="text" name="destinationAddress" />
          <ErrorMessage name="destinationAddress" component="div" />
          <div role="group" aria-labelledby="my-radio-group">
            <label>
              <Field type="radio" name="network" value={layerTwos[0].name} />
              {layerTwos[0].displayName}
            </label>
            <label>
              <Field type="radio" name="network" value={layerTwos[1].name} />
              {layerTwos[1].displayName}
            </label>
          </div>
          <button type="submit" disabled={isSubmitting}>
            Submit
          </button>
        </Form>
      )}
    </Formik>
  </div>
  )
};

export default Swap;