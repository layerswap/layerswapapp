import { FC, useEffect, useRef } from 'react';
import { SwapDataProvider } from '../context/swap';
import { TimerProvider } from '../context/timerContext';
import SwapForm from "./Swap/Form"
import { BalancesDataProvider } from '../context/balances';
import { SWRConfig, mutate } from 'swr';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';

const Swap: FC = () => {
  return (
    <div className="text-primary-text">
      <SWRConfig value={{ use: [updatePendingCount] }}>
        <SwapDataProvider >
          <TimerProvider>
            <BalancesDataProvider>
              <SwapForm />
            </BalancesDataProvider>
          </TimerProvider>
        </SwapDataProvider >
      </SWRConfig>
    </div >
  )
};
const swapsStatuses: { [key: string]: SwapStatus } = {}

function updatePendingCount(useSWRNext) {

  return (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config)
    useEffect(() => {
      const swapKeyPattern = /^\/swaps\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/;
      // Update ref if data is not undefined.
      const swap = swr.data?.data
      if (swapKeyPattern.test(key) && swap) {
        const status = swap.status
        if (swapsStatuses[swap.id] !== status) {
          mutate(`/swaps/count?version=${LayerSwapApiClient.apiVersion}`)
          console.log("mutated")
        }
        swapsStatuses[swap.id] = status
      }
    }, [swr.data, key])

    return useSWRNext(key, fetcher, config)
  }
}

export default Swap;