import Swap from '../components/swap/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetStaticPropsType } from 'next'

export default function Home() {
  return (
    <Layout>
      <main>
        <Swap settings={settings} />
      </main>

    </Layout>
  )
}

export async function getStaticProps() {
  var apiClient = new LayerSwapApiClient();
  const data = await apiClient.fetchSettingsAsync()

  if (process.env.NODE_ENV == "production") {
    data.networks.forEach((element, index) => {
      if (element.is_test_net) data.networks.splice(index, 1);
    });
  }
  
  return {
    props: { data },
  }
}
