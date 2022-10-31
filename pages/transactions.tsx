import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import TransactionsHistory from '../components/swapHistoryComponent'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'

export default function Transactions({ response }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = response.data.discovery.identity_url
  return (
    <div className='wide-page'>
      <Layout>
        <SettingsProvider data={response}>
          <AuthProvider>
            <MenuProvider>
              <TransactionsHistory />
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
  const response = await apiClient.fetchSettingsAsync()

  const resource_storage_url = response.data.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    response.data.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

  return {
    props: { response, isOfframpEnabled },
  }
}