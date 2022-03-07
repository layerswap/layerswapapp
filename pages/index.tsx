import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'

export default function Home({ data, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <main>
        <Swap settings={data} destNetwork={query.destNetwork} destAddress={query.destAddress} lockAddress={query.lockAddress} lockNetwork={query.lockNetwork} addressSource={query.addressSource} sourceExchangeName={query.sourceExchangeName} asset={query.asset} />
      </main>
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
  const data = await apiClient.fetchSettingsAsync()
  var networks: CryptoNetwork[] = [];
  if (!process.env.IS_TESTING) {
    data.networks.forEach((element, index) => {
      if (!element.is_test_net) networks.push(element);
    });
  }
  else {
    data.networks.forEach((element, index) => {
      if (element.code.startsWith("STARKNET") || !element.is_test_net) networks.push(element);
    });
    networks = data.networks;
  }

  data.networks = networks;

  return {
    props: { data, query },
  }
}
