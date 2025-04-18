import Layout from '../components/Layout'
import AuthWizard from '../components/Pages/Auth/AuthWizard'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'

export default function AuthPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData} >
      <AuthWizard apiKey={apiKey} settings={settings} themeData={themeData} />
    </Layout>
  </>
  )
}

export { getServerSideProps };
