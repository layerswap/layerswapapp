import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings';
import Layout from '../components/Layout';
import PageComponent from '../components/PageComponent';
import "@layerswap/widget/index.css"

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout>
      <PageComponent settings={settings as any} />
    </Layout>
  )
}

export { getServerSideProps };
