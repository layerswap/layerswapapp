import Layout from '../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { Swap, LayerswapContext } from '@layerswap/widget'

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout settings={settings} themeData={themeData}>
      <LayerswapContext
        integrator='experimental'
        apiKey={apiKey}
        settings={settings}
        themeData={themeData}
        version='testnet'
      >
        <Swap/>
      </LayerswapContext>
    </Layout>
  )
}

export { getServerSideProps };
