import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SwapDataProvider } from '../context/swap'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import SwapHistoryWithExplorerWrapper from '../components/SwapHistoryWithExplorer/SwapHistoryWithExplorerWrapper'

export default function Explorer({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <SwapDataProvider >
          <SwapHistoryWithExplorerWrapper />
        </SwapDataProvider >
      </Layout>
    </>
  )
}

export { getServerSideProps };
