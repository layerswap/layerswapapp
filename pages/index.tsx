import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'

export default function Home({ data, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <main>
        <Swap settings={data} destNetwork={query.destNetwork} destAddress={query.destAddress} lockAddress={query.lockAddress} lockNetwork={query.lockNetwork} />
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
  var result: CryptoNetwork[] = [];
  //if (!process.env.IS_TESTING) {
  data.networks.forEach((element, index) => {
    if (!element.is_test_net) result.push(element);
  });
  // }
  // else {
  //   result = data.networks;
  // }

  data.networks = result;

  return {
    props: { data, query },
  }
}
