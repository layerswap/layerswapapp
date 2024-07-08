import { FC } from 'react';
import { SwapDataProvider } from '../context/swap';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { BalancesDataProvider } from '../context/balances';
import { FeeProvider } from '../context/feeContext';

const Swap: FC = () => {

  return (
    <div className="text-primary-text">
      <SwapDataProvider >
        <TimerProvider>
          <BalancesDataProvider>
            <FeeProvider>
              <Atomic />
            </FeeProvider>
          </BalancesDataProvider>
        </TimerProvider>
      </SwapDataProvider >
    </div >
  )
};

export default Swap;