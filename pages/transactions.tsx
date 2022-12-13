import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import TransactionsHistory from '../components/swapHistoryComponent'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SwapDataProvider } from '../context/swap'

export default function Transactions({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  return (
    <div className='wide-page'>
      <Layout>
        <SettingsProvider data={settings}>
          <AuthProvider>
            <MenuProvider>
              <SwapDataProvider >
                <TransactionsHistory />
              </SwapDataProvider >
            </MenuProvider>
          </AuthProvider>
        </SettingsProvider>
      </Layout>
    </div>
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
    settings.discovery.resource_storage_url = 'https://devlslayerswapbridgesa.blob.core.windows.net'

  let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

  return {
    props: { settings, isOfframpEnabled },
  }
}