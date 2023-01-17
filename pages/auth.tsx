import Layout from '../components/layout'
import { MenuProvider } from '../context/menu'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SettingsProvider } from '../context/settings'
import { useEffect, useState } from 'react'
import inIframe from '../components/utils/inIframe'
import IntroCard from '../components/introCard'

export default function AuthPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  const [embadded, setEmbadded] = useState<boolean>()

  useEffect(() => {
    setEmbadded(inIframe())
  }, [])

  return (
    <Layout>
      <SettingsProvider data={settings}>
        <MenuProvider>
          <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
            <AuthWizard />
          </FormWizardProvider >
        </MenuProvider>
      </SettingsProvider>
      {
        !embadded &&
        <IntroCard />
      }
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