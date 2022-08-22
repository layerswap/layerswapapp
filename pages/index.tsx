import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { SettingsProvider } from '../context/settings'
import { QueryProvider } from '../context/query'

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
  if (process.env.IS_TESTING == "false") {
    response.data.networks.forEach((element) => {
      if (!element.is_test_net) networks.push(element);
    });
  }
  else {
    networks = response.data.networks;
  }
  response.data.networks = networks;
  return {
    props: { response, query },
  }
}
