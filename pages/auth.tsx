import Layout from '../components/layout'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { useEffect, useState } from 'react'
import inIframe from '../components/utils/inIframe'
import { SwapDataProvider } from '../context/swap'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { InferGetServerSidePropsType } from 'next'
import ColorSchema from '../components/ColorSchema'
import { getServerSideProps } from '../helpers/getSettings'

export default function AuthPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  let appSettings = new LayerSwapAppSettings(settings)
  LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url
  const [embedded, setEmbedded] = useState<boolean>()

  useEffect(() => {
    setEmbedded(inIframe())
  }, [])

  return (<>
    <Layout settings={appSettings}>
      <SwapDataProvider>
        <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
          <AuthWizard />
        </FormWizardProvider >
      </SwapDataProvider>
    </Layout>
    <ColorSchema themeData={themeData} />
  </>
  )
}

export { getServerSideProps };
