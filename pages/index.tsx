import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'

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

  if (!process.env.IS_TESTING) {
    data.networks.forEach((element, index) => {
      if (element.is_test_net) data.networks.splice(index, 1);
    });
  }

  return {
    props: { data, query },
  }
}
