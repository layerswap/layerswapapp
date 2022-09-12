import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import TransactionsHistory from '../components/swapHistoryComponent'
import { MenuProvider } from '../context/menu'
import { SettingsProvider } from '../context/settings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'

export default function Transactions({ response }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
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
  var networks: CryptoNetwork[] = [];
  if (!process.env.IS_TESTING) {
    response.data.networks.forEach((element) => {
       networks.push(element);
    });
  }
  else {
    networks = response.data.networks;
  }

  response.data.networks = networks;
  let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

  return {
    props: { response, query, isOfframpEnabled },
  }
}