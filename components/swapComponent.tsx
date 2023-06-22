import React, { useEffect, useState } from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { UserExchangeProvider } from '../context/userExchange';
import { MenuProvider } from '../context/menu';
import IntroCard from './introCard';
import { AuthStep, SwapCreateStep } from '../Models/Wizard';
import { FormWizardProvider } from '../context/formWizardProvider';
import inIframe from './utils/inIframe';
import { useAuthState, UserType } from '../context/authContext';
import GuestCard from './guestCard';
import { TimerProvider } from '../context/timerContext';
import SwapForm from "./Swap/Form"
import { WalletDatadProvider } from '../context/wallet';

const Swap: FC = () => {
  const [embedded, setEmbedded] = useState<boolean>()
  const { userType } = useAuthState()
  useEffect(() => {
    setEmbedded(inIframe())
  }, [])

  return (
    <div className="text-white">
      <MenuProvider>
        <SwapDataProvider >
          <UserExchangeProvider>
            <TimerProvider>
              <WalletDatadProvider>
                <SwapForm />
              </WalletDatadProvider>
              {
                !embedded && userType && userType != UserType.AuthenticatedUser &&
                <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} hideMenu>
                  <GuestCard />
                </FormWizardProvider>
              }
            </TimerProvider>
          </UserExchangeProvider>
        </SwapDataProvider >
      </MenuProvider>
      {
        !embedded &&
        <IntroCard />
      }
    </div >
  )
};

export default Swap;