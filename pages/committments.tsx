import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SwapDataProvider } from '../context/swap'
import CommitmentsHostory from '../components/Swap/CommitmentsHistory'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <SwapDataProvider >
          <CommitmentsHostory />
        </SwapDataProvider >
      </Layout>
    </>
  )
}

export { getServerSideProps };
