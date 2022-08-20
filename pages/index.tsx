import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { SettingsProvider } from '../context/settings'
import { QueryProvider } from '../context/query'
import { AccountProvider } from '../context/account'
import KnownIds from '../lib/knownIds'

export default function Home({ response, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout>
      <div className="content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
        <div className='flex flex-col space-y-5 animate-fade-in'>
          <SettingsProvider data={response}>
            <QueryProvider query={query}>
              <Swap />
            </QueryProvider>
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
  query.addressSource && (query.addressSource = query.addressSource?.toLowerCase());
  var apiClient = new LayerSwapApiClient();
  const response = await apiClient.fetchSettingsAsync()
  var networks: CryptoNetwork[] = [];
  data.networks.forEach((element) => {
    if (!element.is_test_net || element.id.toLowerCase() == KnownIds.Networks.StarkNetGoerliId) networks.push(element);
  });

  response.data.networks = networks;
  return {
    props: { response, query },
  }
}
