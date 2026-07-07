import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SwapDataProvider } from '../context/swap'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/apiClients/layerSwapApiClient'
import TransactionsHistory from '../components/SwapHistory'
import { useMemo } from 'react'
import { inflateSettings } from '../helpers/settingsCompression'
import MaintananceContent from '../components/maintanance/maintanance'

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  const resolvedSettings = useMemo(() => inflateSettings(settings), [settings])

  if (!resolvedSettings) return <MaintananceContent />

  return (
    <Layout settings={resolvedSettings} themeData={themeData}>
      <SwapDataProvider >
        <TransactionsHistory />
      </SwapDataProvider >
    </Layout>
  )
}

export { getServerSideProps };
