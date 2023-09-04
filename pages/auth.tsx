import Layout from '../components/layout'
import { FormWizardProvider } from '../context/formWizardProvider'
import { AuthStep } from '../Models/Wizard'
import AuthWizard from '../components/Wizard/AuthWizard'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { useEffect, useState } from 'react'
import inIframe from '../components/utils/inIframe'
import { SwapDataProvider } from '../context/swap'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { THEME_COLORS } from '../Models/Theme'
import ColorSchema from '../components/ColorSchema'

export default function AuthPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  let appSettings = new LayerSwapAppSettings(settings)

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

export async function getServerSideProps(context) {

  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  var apiClient = new LayerSwapApiClient();
  const { data: settings } = await apiClient.GetSettingsAsync()

  const resource_storage_url = settings.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  let themeData = null
  try {
    const theme_name = context.query.theme || context.query.addressSource
    // const internalApiClient = new InternalApiClient()
    // const themeData = await internalApiClient.GetThemeData(theme_name);
    // result.themeData = themeData as ThemeData;
    themeData = THEME_COLORS[theme_name] || null;
  }
  catch (e) {
    console.log(e)
  }
  return {
    props: { settings, themeData }
  }
}