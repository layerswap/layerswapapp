import React, { useEffect, useState } from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { AuthProvider } from '../context/authContext';
import { UserExchangeProvider } from '../context/userExchange';
import { MenuProvider } from '../context/menu';
import IntroCard from './introCard';
import CreateSwap from './Wizard/CreateSwapWizard';
import { SwapCreateStep } from '../Models/Wizard';
import { FormWizardProvider } from '../context/formWizardProvider';
import inIframe from './utils/inIframe';


const Swap: FC = () => {
  const [embadded, setEmbadded] = useState<boolean>()

  useEffect(() => {
    setEmbadded(inIframe())
  }, [])

  return (
    <div className="text-white">
      <AuthProvider>
        <MenuProvider>
          <SwapDataProvider >
            <UserExchangeProvider>
              <FormWizardProvider initialStep={SwapCreateStep.MainForm} initialLoading={true}>
                <CreateSwap />
              </FormWizardProvider>
            </UserExchangeProvider>
          </SwapDataProvider >
        </MenuProvider>
        {
          !embadded &&
          <IntroCard />
        }
      </AuthProvider>
    </div >
  )
};

export default Swap;