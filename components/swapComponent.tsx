import React from 'react';
import { FC } from 'react'
import MainStep from './Wizard/Steps/MainStep';
import { SwapDataProvider } from '../context/swap';
import { AuthProvider } from '../context/authContext';
import { UserExchangeProvider } from '../context/userExchange';
import Wizard from './Wizard/Wizard';
import { FormWizardSteps } from '../Models/Wizard';
import EmailStep from './Wizard/Steps/EmailStep';
import CodeStep from './Wizard/Steps/CodeStep';
import { FormWizardProvider } from '../context/formWizardProvider';
import APIKeyStep from './Wizard/Steps/APIKeyStep';
import AccountConnectStep from './Wizard/Steps/AccountConnectStep';
import { MenuProvider } from '../context/menu';
import IntroCard from './introCard';
import SwapConfirmationStep from './Wizard/Steps/SwapConfirmationStep';
import OfframpAccountConnectStep from './Wizard/Steps/OfframpAccountConnectStep';


const FormWizard: FormWizardSteps = {
  "SwapForm": { title: "Swap", content: MainStep, navigationDisabled: true, positionPercent: 0 },
  "Email": { title: "Email confirmation", content: EmailStep, dismissOnBack: true, positionPercent: 30 },
  "Code": { title: "Code", content: CodeStep, dismissOnBack: true, navigationDisabled: true, positionPercent: 35 },
  "ExchangeOAuth": { title: "OAuth flow", content: AccountConnectStep, dismissOnBack: true, positionPercent: 45 },
  "OffRampExchangeOAuth": { title: "OAuth flow", content: OfframpAccountConnectStep, dismissOnBack: true, positionPercent: 45 },
  "ExchangeApiCredentials": { title: "Please provide Read-only API keys", content: APIKeyStep, dismissOnBack: true, positionPercent: 50 },
  "SwapConfirmation": { title: "Swap confirmation", content: SwapConfirmationStep, positionPercent: 60 },
}


const Swap: FC = () => {

  return (
    <div>
      <div className="text-white">
        <AuthProvider>
          <MenuProvider>
            <SwapDataProvider >
              <UserExchangeProvider>
                  <Wizard />
              </UserExchangeProvider>
            </SwapDataProvider >
          </MenuProvider>
        </AuthProvider>
        <IntroCard />
      </div >
    </div >
  )
};

export default Swap;