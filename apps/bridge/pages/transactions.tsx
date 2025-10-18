import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { TransactionsHistory } from '@layerswap/widget';
import Layout from '../components/layout';

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <TransactionsHistory settings={settings} config={{ theme: themeData }} apiKey={apiKey} integrator='' />
      </Layout>
    </>
  )
}

export { getServerSideProps };