import Layout from '../components/layout'
import { AuthProvider } from '../context/authContext'
import { MenuProvider } from '../context/menu'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SettingsProvider } from '../context/settings'

export default function AuthPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

  return (
    <Layout>
      <SettingsProvider data={settings}>
        <AuthProvider>
          <MenuProvider>
            <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
              <AuthWizard />
            </FormWizardProvider >
          </MenuProvider>
        </AuthProvider>
      </SettingsProvider>
    </Layout>
  )
}
export async function getServerSideProps(context) {

  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  var apiClient = new LayerSwapApiClient();
  const { data: settings } = await apiClient.GetSettingsAsync()

  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

  return {
    props: { settings }
  }
}