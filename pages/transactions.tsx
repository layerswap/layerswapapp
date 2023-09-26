import Layout from '../components/layout'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SwapDataProvider } from '../context/swap'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import ColorSchema from '../components/ColorSchema'
import { THEME_COLORS } from '../Models/Theme'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { getServerSideProps } from '../helpers/getSettings'

export default function Transactions({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  let appSettings = new LayerSwapAppSettings(settings)

  return (
    <>
      <Layout settings={appSettings}>
        <SwapDataProvider >
          <TransfersWrapper />
        </SwapDataProvider >
      </Layout>
      <ColorSchema themeData={themeData} />
    </>
  )
}

export { getServerSideProps };
