import React, { useRef, useState } from 'react';
import { Formik, Form, Field, FormikErrors, useFormikContext, FormikProps } from 'formik';
import { FC } from 'react'
import axios from 'axios';
import { useRouter } from 'next/router'
import { CryptoNetwork } from '../Models/CryptoNetwork';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import CardContainer from './cardContainer';
import InsetSelectMenu from './selectMenu/insetSelectMenu';
import { isValidAddress } from '../lib/etherAddressValidator';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { Currency } from '../Models/Currency';
import { Exchange } from '../Models/Exchange';
import { SelectMenuItem } from './selectMenu/selectMenuItem';
import SelectMenu from './selectMenu/selectMenu';
import IntroCard from './introCard';
import MainStep from './Wizard/Steps/MainStep';
import { SwapDataProvider } from '../context/swap';
import { AuthProvider } from '../context/auth';
import { UserExchangeProvider } from '../context/userExchange';
import Wizard from './Wizard/Wizard';
import { FormWizardSteps } from '../Models/Wizard';
import EmailStep from './Wizard/Steps/EmailStep';
import CodeStep from './Wizard/Steps/CodeStep';
import { FormWizardProvider } from '../context/formWizardProvider';
import APIKeyStep from './Wizard/Steps/APIKeyStep';
import SwapConfirmationStep from './Wizard/Steps/SwapConfirmation';
import AccountConnectStep from './Wizard/Steps/AccountConnectStep';
import { MenuProvider } from '../context/menu';

const FormWizard: FormWizardSteps = {
  "SwapForm": { title: "Swap", content: MainStep, navigationDisabled: true, positionPercent: 0 },
  "Email": { title: "Email confirmation", content: EmailStep, dismissOnBack: true, positionPercent: 30 },
  "Code": { title: "Code", content: CodeStep, dismissOnBack: true, positionPercent: 35 },
  "ExchangeOAuth": { title: "OAuth flow", content: AccountConnectStep, dismissOnBack: true, positionPercent: 40 },
  "ExchangeApiCredentials": { title: "Please provide Read-only API keys", content: APIKeyStep, dismissOnBack: true, positionPercent: 40 },
  "SwapConfirmation": { title: "Swap confirmation", content: SwapConfirmationStep, positionPercent: 60 },
}

const Swap: FC = () => {

  return (
    <div>
      <div className="flex flex-col space-y-6 text-white">
        <AuthProvider>
          <MenuProvider>
            <SwapDataProvider >
              <UserExchangeProvider>
                <FormWizardProvider wizard={FormWizard} initialStep={"SwapForm"}>
                  <Wizard />
                  <TestComp />
                </FormWizardProvider >
              </UserExchangeProvider>
            </SwapDataProvider >
          </MenuProvider>
        </AuthProvider>
        <IntroCard />
      </div >
    </div >
  )
};

function TestComp() {
  console.log("Test compnent rerendered")
  return <></>
}


export default Swap;