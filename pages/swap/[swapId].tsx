import LayerSwapApiClient from '../../lib/layerSwapApiClient';
import Layout from '../../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { SwapDataProvider } from '../../context/swap';
import SwapWithdrawal from '../../components/SwapWithdrawal';
import { TimerProvider } from '../../context/timerContext';
import { getThemeData } from '../../helpers/settingsHelper';

const SwapDetails = ({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) => {

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

  var apiClient = new LayerSwapApiClient();
  const { data } = await apiClient.GetSettingsAsync()
  const settings = data
  let themeData = await getThemeData(ctx.query)
  return {
    props: {
      settings,
      themeData
    }
  }
}

export default SwapDetails