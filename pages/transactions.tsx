import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SwapDataProvider } from '../context/swap'
import TransfersWrapper from '../components/SwapHistory/TransfersWrapper'
import { getServerSideProps } from '../helpers/getSettings'

export default function Transactions({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <SwapDataProvider >
          <TransfersWrapper />
        </SwapDataProvider >
      </Layout>
    </>
  )
}

export { getServerSideProps };
