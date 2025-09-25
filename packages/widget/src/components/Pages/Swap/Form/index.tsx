"use client";
import { FC, useEffect, useMemo } from 'react';
import { TimerProvider } from '@/context/timerContext';
import SwapForm from "./Form"
import { SWRConfig, mutate } from 'swr';
import { SwapStatus } from '@/Models/SwapStatus';
import AppSettings from '@/lib/AppSettings';
import { useSettingsState } from '@/context/settings';
import { SwapFormValues } from './SwapFormValues';

type SwapProps = {
  formValues?: SwapFormValues,
  featuredNetwork?: {
    initialDirection: 'from' | 'to',
    network: string,
    oppositeDirectionOverrides?: 'onlyNetworks' | 'onlyExchanges' | string[]
  }
}

export const Swap: FC<SwapProps> = (props) => {
  const { formValues, featuredNetwork } = props;
  const settings = useSettingsState()

  AppSettings.FeaturedNetwork = featuredNetwork

  const overriddenFormValues = useMemo(() => {
    const updatedFormValues = { ...formValues };
    if (featuredNetwork) {
      if (featuredNetwork.initialDirection === 'from') {
        const from = settings?.sourceRoutes?.find(network => network.name === featuredNetwork.network);
        updatedFormValues.from = from;
      } else if (featuredNetwork.initialDirection === 'to') {
        const to = settings?.destinationRoutes?.find(network => network.name === featuredNetwork.network);
        updatedFormValues.to = to;
      }
      return updatedFormValues;
    }
    return updatedFormValues;
  }, [formValues, featuredNetwork]);

  return (
    <div className="text-primary-text">
      <SWRConfig value={{ use: [updatePendingCount] }}>
        <TimerProvider>
          <SwapForm formValues={overriddenFormValues} />
        </TimerProvider>
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
          mutate('/internal/swaps/count')
        }
        swapsStatuses[swap.id] = status
      }
    }, [swr.data, key])

    return useSWRNext(key, fetcher, config)
  }
}
