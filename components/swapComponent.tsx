import { FC } from 'react';
import { SwapDataProvider } from '../context/swap';
import { TimerProvider } from '../context/timerContext';
import SwapForm from "./Swap/Form"
import { BalancesDataProvider } from '../context/balances';
import { FeeProvider } from '../context/feeContext';

const Swap: FC = () => {
  return (
    <div className="text-primary-text">
      <SwapDataProvider >
        <TimerProvider>
          <BalancesDataProvider>
            <FeeProvider>
              <SwapForm />
            </FeeProvider>
          </BalancesDataProvider>
        </TimerProvider>
      </SwapDataProvider >
    </div >
  )
};

export default Swap;