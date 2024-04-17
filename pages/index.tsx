import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <Layout settings={settings} themeData={themeData}>
      <Swap />
    </Layout>
  )
}

export { getServerSideProps };
