import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SwapDataProvider } from '../context/swap'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { getServerSideProps } from '../helpers/getSettings'

export default function Transactions({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  let appSettings = new LayerSwapAppSettings(settings)
  LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url


  return (
    <>
      <Layout settings={appSettings} themeData={themeData}>
        <SwapDataProvider >
          <TransfersWrapper />
        </SwapDataProvider >
      </Layout>
    </>
  )
}

export { getServerSideProps };
