import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings';
import Layout from '../components/Layout';
import { PageComponent } from '@/components/PageComponent';
import { WidgetLoading } from '@layerswap/widget';
export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  if (!settings)
    return <WidgetLoading />

  return (
    <Layout>
      <PageComponent settings={settings} />
    </Layout>
  )
}

export { getServerSideProps };
