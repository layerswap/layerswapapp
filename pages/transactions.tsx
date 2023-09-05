import Layout from '../components/layout'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SwapDataProvider } from '../context/swap'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { getServerSideSettings } from '../helpers/getSettings'

export default function Transactions({ settings }: InferGetServerSidePropsType<typeof getServerSideSettings>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  let appSettings = new LayerSwapAppSettings(settings)

  return (
      <Layout>
        <SettingsProvider data={appSettings}>
          <MenuProvider>
            <SwapDataProvider >
              <TransfersWrapper />
            </SwapDataProvider >
          </MenuProvider>
        </SettingsProvider>
      </Layout>
  )
}