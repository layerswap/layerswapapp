import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import SwapPage from '../components/Pages/Swap'
import { LayerswapApiClient } from '@layerswap/widget/internal'

export default function Home({ settings, themeData, apiKey, initialValues }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerswapApiClient.apiKey = apiKey
  return (
    <Layout settings={settings} themeData={themeData}>
      <SwapPage
        apiKey={apiKey}
        settings={settings}
        themeData={themeData}
        initialValues={initialValues}
      />
    </Layout>
  )
}

export { getServerSideProps };