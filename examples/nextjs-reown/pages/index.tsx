import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings';
import Layout from '../components/Layout';
import PageComponent from '../components/PageComponent';
export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout>
      <PageComponent settings={settings} />
    </Layout>
  )
}

export { getServerSideProps };
