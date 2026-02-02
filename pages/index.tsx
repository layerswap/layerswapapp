import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'
import { SWRConfig, mutate } from 'swr'
import { SwapStatus } from '../Models/SwapStatus'
import { useEffect, useMemo } from 'react'
import LayerSwapApiClient from '../lib/apiClients/layerSwapApiClient'
import { resolveExchangesURLForSelectedToken, resolveRoutesURLForSelectedToken } from '../helpers/routes'

// Hoisted RegExp for swap key pattern matching (js-hoist-regexp)
const SWAP_KEY_PATTERN = /^\/swaps\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey

  const sourceRoutesDeafultKey = resolveRoutesURLForSelectedToken({ direction: 'from', network: undefined, token: undefined, includes: { unmatched: true, unavailable: true, swaps: true } })
  const destinationRoutesDefaultKey = resolveRoutesURLForSelectedToken({ direction: 'to', network: undefined, token: undefined, includes: { unmatched: true, unavailable: true, swaps: true } })
  const sourceExchangesDeafaultkey = resolveExchangesURLForSelectedToken({})

  // Memoize SWRConfig value to prevent unnecessary re-renders (rerender-memo)
  const swrConfig = useMemo(() => ({
    use: [updatePendingCount],
    fallback: {
      [sourceRoutesDeafultKey]: { data: settings?.sourceRoutes, error: null },
      [destinationRoutesDefaultKey]: { data: settings?.destinationRoutes, error: null },
      [sourceExchangesDeafaultkey]: { data: settings?.sourceExchanges, error: null },
    }
  }), [sourceRoutesDeafultKey, destinationRoutesDefaultKey, sourceExchangesDeafaultkey, settings])

  return (
    <SWRConfig value={swrConfig}>
      <Layout settings={settings || undefined} themeData={themeData}>
        <Swap />
      </Layout>
    </SWRConfig>
  )
}

// Note: Module-level state for tracking swap status changes.
// Consider moving to a proper state store if this grows in complexity.
const swapsStatuses: { [key: string]: SwapStatus } = {}

function updatePendingCount(useSWRNext) {
  return (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config)
    useEffect(() => {
      const swap = swr.data?.data
      if (SWAP_KEY_PATTERN.test(key) && swap) {
        const status = swap.status
        if (swapsStatuses[swap.id] !== status) {
          mutate('/internal/swaps/count')
        }
        swapsStatuses[swap.id] = status
      }
    }, [swr.data, key])

    return swr
  }
}

export { getServerSideProps };
