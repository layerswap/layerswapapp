import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'

export default function Home({ data, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <main>
        <Swap settings={data} destNetwork={query.destNetwork} />
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
  if (!process.env.IS_TESTING) {
    data.networks.forEach((element, index) => {
      if (!element.is_test_net) result.push(element);
    });
  }
  else {
    data.networks.forEach((element, index) => {
      if (!element.is_test_net || element.id == "7569e39c-78fa-4ff3-a618-30b3e4a88589") result.push(element);
    });
  }

  data.networks = result;

  return {
    props: { data, query },
  }
}
