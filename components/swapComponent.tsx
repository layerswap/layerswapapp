import React from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { MenuProvider } from '../context/menu';
import { TimerProvider } from '../context/timerContext';
import SwapForm from "./Swap/Form"
import { BalancesDataProvider } from '../context/balances';

const Swap: FC = () => {
  return (
    <div className="text-primary-text">
      <MenuProvider>
        <SwapDataProvider >
          <TimerProvider>
            <BalancesDataProvider>
              <SwapForm />
            </BalancesDataProvider>
          </TimerProvider>
        </SwapDataProvider >
      </MenuProvider>
    </div >
  )
};

export default Swap;