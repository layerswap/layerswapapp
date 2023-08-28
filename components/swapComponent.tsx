import React, { useEffect, useState } from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { UserExchangeProvider } from '../context/userExchange';
import { MenuProvider } from '../context/menu';
import inIframe from './utils/inIframe';
import { useAuthState } from '../context/authContext';
import { TimerProvider } from '../context/timerContext';
import SwapForm from "./Swap/Form"
import { WalletDataProvider } from '../context/wallet';

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
              <WalletDataProvider>
                <SwapForm />
                {/* {
              {
                !embedded && userType && userType != UserType.AuthenticatedUser &&
                <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} hideMenu>
                  <GuestCard />
                </FormWizardProvider>
              } */}
              </WalletDataProvider>
            </TimerProvider>
          </UserExchangeProvider>
        </SwapDataProvider >
      </MenuProvider>
    </div >
  )
};

export default Swap;