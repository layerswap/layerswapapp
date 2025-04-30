import Layout from '../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { Swap, LayerswapProvider } from '@layerswap/widget'

export default function Home({ settings, apiKey, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout settings={settings} themeData={themeData}>
      <LayerswapProvider
        integrator='experimental'
        apiKey={apiKey}
        settings={settings}
        themeData={{...themeData, borderRadius: 'default'}}
      >
        <Swap/>
      </LayerswapProvider>
    </Layout>
  )
}

export { getServerSideProps };
