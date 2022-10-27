import React from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { AuthProvider } from '../context/authContext';
import { UserExchangeProvider } from '../context/userExchange';
import { MenuProvider } from '../context/menu';
import IntroCard from './introCard';
import CreateSwap from './Wizard/CreateSwapWizard';
import { SwapCreateStep } from '../Models/Wizard';
import { FormWizardProvider } from '../context/formWizardProvider';
import { useQueryState } from '../context/query';

const Swap: FC = () => {
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
      </AuthProvider>
      <IntroCard />
    </div >
  )
};

export default Swap;