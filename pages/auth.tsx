import Layout from '../components/layout'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import { SwapDataProvider } from '../context/swap'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'

export default function AuthPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (<>
    <Layout settings={settings} themeData={themeData} >
      <SwapDataProvider>
        <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false}>
          <AuthWizard />
        </FormWizardProvider >
      </SwapDataProvider>
    </Layout>
  </>
  )
}

export { getServerSideProps };
