import React from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { MenuProvider } from '../context/menu';
import { TimerProvider } from '../context/timerContext';
import SwapForm from "./Swap/Form"
import { WalletDataProvider } from '../context/wallet';

const Swap: FC = () => {
  return (
    <div className="text-white">
      <MenuProvider>
        <SwapDataProvider >
            <TimerProvider>
              <WalletDataProvider>
                <SwapForm />
              </WalletDatadProvider>
            </TimerProvider>
        </SwapDataProvider >
      </MenuProvider>
    </div >
  )
};

export default Swap;