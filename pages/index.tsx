import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { Currency } from '../Models/Currency'

export default function Home({ data, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <main>
        <Swap settings={data} destNetwork={query.destNetwork} destAddress={query.destAddress} lockAddress={query.lockAddress} lockNetwork={query.lockNetwork} addressSource={query.addressSource} />
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
  var currencies: Currency[] = [];

  if (!process.env.IS_TESTING) {
    data.networks.forEach((element, index) => {
      if (!element.is_test_net) networks.push(element);
    });
    data.currencies.forEach((element, index) => {
      if (element.id != "905c4647-858d-4756-b0c5-3e08382be6ad") currencies.push(element);
    });
  }
  else {
    networks = data.networks;
    currencies = data.currencies;
  }

  data.networks = networks;
  data.currencies = currencies;

  return {
    props: { data, query },
  }
}
