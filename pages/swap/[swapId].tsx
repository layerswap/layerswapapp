import LayerSwapApiClient from '../../lib/layerSwapApiClient';
import Layout from '../../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { SwapDataProvider } from '../../context/swap';
import SwapWithdrawal from '../../components/SwapWithdrawal';
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient';
import { TimerProvider } from '../../context/timerContext';
import { THEME_COLORS } from '../../Models/Theme';
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings';

const SwapDetails = ({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) => {

  let appSettings = new LayerSwapAppSettings(settings)
  LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url

  return (<>
    <Layout settings={appSettings} themeData={themeData}>
      <SwapDataProvider >
        <TimerProvider>
          <SwapWithdrawal />
        </TimerProvider>
      </SwapDataProvider >
    </Layout>
  </>)
}

export const getServerSideProps = async (ctx) => {
  const params = ctx.params;
  let isValidGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.swapId);
  if (!isValidGuid) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      }
    }
  }

  var apiClient = new LayerSwapApiClient();
  const { data } = await apiClient.GetSettingsAsync()
  const settings = data
  let themeData = await getThemeData(ctx.query.theme || ctx.query.addressSource)
  return {
    props: {
      settings,
      themeData
    }
  }
}
const getThemeData = async (theme_name: string) => {
  try {
    // const internalApiClient = new InternalApiClient()
    // const themeData = await internalApiClient.GetThemeData(theme_name);
    // result.themeData = themeData as ThemeData;
    return THEME_COLORS[theme_name] || null;
  }
  catch (e) {
    console.log(e)
  }
}
export default SwapDetails