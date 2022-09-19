import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { SettingsProvider } from '../context/settings'
import { QueryProvider } from '../context/query'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { QueryParams } from '../Models/QueryParams'
import MaintananceContent from '../components/maintanance/maintanance'

type IndexProps = {
  settings?: LayerSwapSettings,
  query?: QueryParams,
  inMaintanance: boolean,
}

export default function Home({ settings, query, inMaintanance }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout>
      <div className="content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
        <div className='flex flex-col space-y-5 animate-fade-in'>
          {
            inMaintanance
              ?
              <MaintananceContent />
              :
              <SettingsProvider data={settings}>
                <QueryProvider query={query}>
                  <Swap />
                </QueryProvider>
              </SettingsProvider>
          }
        </div>
      </div>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  let result: IndexProps = {
    inMaintanance: false,
  };

  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  result.query = context.query;
  result.query.addressSource && (result.query.addressSource = result.query.addressSource?.toLowerCase());
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

  result.settings = response;
  if (!result.settings.data.networks.some(x => x.status === "active")) {
    result.inMaintanance = true;
  }
  return {
    props: result,
  }
}
