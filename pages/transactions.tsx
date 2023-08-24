import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SwapDataProvider } from '../context/swap'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { getServerSideProps } from '../lib/serverSidePropsUtils'

export default function Transactions({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

  return (
    <Layout>
      <SwapDataProvider >
        <TransfersWrapper />
      </SwapDataProvider >
    </Layout>
  )
}