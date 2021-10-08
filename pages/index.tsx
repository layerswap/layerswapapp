import Swap from '../components/swap/swapComponent'
import Layout from '../components/layout'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import axios from 'axios'
import { InferGetStaticPropsType } from 'next'
import { env } from 'process'

export default function Home({ data }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <Layout>
      <main>
        <Swap settings={data} />
      </main>

    </Layout>
  )
}

export async function getStaticProps() {
  const data = await fetchSettingsAsync()

  if (process.env.NODE_ENV == "production") {
    data.networks.forEach((element, index) => {
      if (element.is_test_net) data.networks.splice(index, 1);
    });
  }
  
  return {
    props: { data },
  }
}

export async function fetchSettingsAsync(): Promise<LayerSwapSettings> {
  return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/settings').then(res => res.data);
}