import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SwapDataProvider } from '../context/swap'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <SwapDataProvider >
          <TransfersWrapper />
        </SwapDataProvider >
      </Layout>
    </>
  )
}

export { getServerSideProps };
