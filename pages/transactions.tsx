import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import TransactionsHistory from '../components/swapHistoryComponent'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { QueryProvider } from '../context/query'

export default function Transactions({ response, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <QueryProvider query={query}>
      <Layout>
        <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8">
          <div className="flex flex-col text-white animate-fade-in">
            <SettingsProvider data={response}>
              <AuthProvider>
                <MenuProvider>
                  <TransactionsHistory />
                </MenuProvider>
              </AuthProvider>
            </SettingsProvider>
          </div>
        </div>
      </Layout>
    </QueryProvider >
  )
}

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  var query = context.query;
  var apiClient = new LayerSwapApiClient();
  const response = await apiClient.fetchSettingsAsync()

  const resource_storage_url = response.data.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    response.data.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

  return {
    props: { response, query, isOfframpEnabled },
  }
}