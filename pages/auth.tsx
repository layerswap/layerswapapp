import Layout from '../components/layout'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { useEffect, useState } from 'react'
import inIframe from '../components/utils/inIframe'
import { SwapDataProvider } from '../context/swap'
import { getServerSideProps } from '../lib/serverSidePropsUtils'

export default function AuthPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

  const [embedded, setEmbedded] = useState<boolean>()

  useEffect(() => {
    setEmbedded(inIframe())
  }, [])

  return (
    <Layout settings={settings}>
      <SwapDataProvider>
        <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
          <AuthWizard />
        </FormWizardProvider >
      </SwapDataProvider>
    </Layout>
  )
}
