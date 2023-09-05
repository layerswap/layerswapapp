import Layout from '../components/layout'
import { MenuProvider } from '../context/menu'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { SettingsProvider } from '../context/settings'
import { useEffect, useState } from 'react'
import inIframe from '../components/utils/inIframe'
import { SwapDataProvider } from '../context/swap'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { getServerSideProps } from '../helpers/getSettings'
import { InferGetServerSidePropsType } from 'next'

export default function AuthPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  let appSettings = new LayerSwapAppSettings(settings)
  LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url
  const [embedded, setEmbedded] = useState<boolean>()

  useEffect(() => {
    setEmbedded(inIframe())
  }, [])

  return (
    <Layout>
      <SettingsProvider data={appSettings}>
        <SwapDataProvider>
          <MenuProvider>
            <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
              <AuthWizard />
            </FormWizardProvider >
          </MenuProvider>
        </SwapDataProvider>
      </SettingsProvider>
    </Layout>
  )
}

export { getServerSideProps };