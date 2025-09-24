import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/apiClients/layerswapApiClient'
import { Swap, LayerswapProvider } from '@layerswap/widget'

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <Layout settings={settings} themeData={themeData}>
      <LayerswapProvider
        integrator='experimental'
        apiKey={apiKey}
        settings={settings}
        themeData={{ ...themeData as any, borderRadius: 'default', enablePortal: true }}
      >
        <Swap />
      </LayerswapProvider>
    </Layout>
  )
}

export { getServerSideProps };