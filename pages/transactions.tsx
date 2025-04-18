import Layout from '../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import TransactionsHistory from '../components/Pages/SwapHistory';

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <TransactionsHistory settings={settings} themeData={themeData} apiKey={apiKey} />
      </Layout>
    </>
  )
}

export { getServerSideProps };
