import LayerSwapApiClient from '../../lib/layerSwapApiClient';
import Layout from '../../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { SwapDataProvider } from '../../context/swap';
import { TimerProvider } from '../../context/timerContext';
import { getThemeData } from '../../helpers/settingsHelper';
import SwapWithdrawal from '../../components/SwapWithdrawal'

const SwapDetails = ({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  LayerSwapApiClient.apiKey = apiKey
  return (<>
    <Layout settings={settings} themeData={themeData}>
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
  const app = ctx.query?.appName
  const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
  LayerSwapApiClient.apiKey = apiKey
  const apiClient = new LayerSwapApiClient()
  const { data: networkData } = await apiClient.GetLSNetworksAsync()
  const { data: exchangeData } = await apiClient.GetExchangesAsync()

  if (!networkData || !exchangeData) return

  const settings = {
    networks: networkData,
    exchanges: exchangeData,
  }

  const themeData = await getThemeData(ctx.query)

  return {
    props: {
      settings,
      themeData,
      apiKey
    }
  }
}

export default SwapDetails