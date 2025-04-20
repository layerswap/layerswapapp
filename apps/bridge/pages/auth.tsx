import Layout from '../components/Layout'
import { Auth } from '@layerswap/widget'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'

export default function AuthPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData} >
      <Auth apiKey={apiKey} settings={settings} themeData={themeData} />
    </Layout>
  </>
  )
}

export { getServerSideProps };
