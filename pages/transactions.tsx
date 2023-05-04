import Layout from '../components/layout'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SwapDataProvider } from '../context/swap'
import TransactionsHistory from '../components/SwapHistory'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'

export default function Transactions({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
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

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  var apiClient = new LayerSwapApiClient();
  const { data: settings } = await apiClient.GetSettingsAsync()

  const resource_storage_url = settings.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

  return {
    props: { settings, isOfframpEnabled },
  }
}