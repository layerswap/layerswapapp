import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/apiClients/layerswapApiClient'
import SwapPage from '../components/Pages/Swap'

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <Layout settings={settings} themeData={themeData}>
      <SwapPage
        apiKey={apiKey}
        settings={settings}
        themeData={themeData}
      />
    </Layout>
  )
}

export { getServerSideProps };