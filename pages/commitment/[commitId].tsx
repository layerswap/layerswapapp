import LayerSwapApiClient from '../../lib/layerSwapApiClient';
import Layout from '../../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { SwapDataProvider } from '../../context/swap';
import { TimerProvider } from '../../context/timerContext';
import { getThemeData } from '../../helpers/settingsHelper';
import CommitmentOld from '../../components/Swap/Commitmentold'
import { DepositMethodProvider } from '../../context/depositMethodContext';
import { BalancesDataProvider } from '../../context/balances';

const CommitmentDetails = ({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  LayerSwapApiClient.apiKey = apiKey
  return (<>
    <Layout settings={settings} themeData={themeData}>
      <SwapDataProvider >
        <TimerProvider>
          <DepositMethodProvider>
            <BalancesDataProvider>
              <CommitmentOld type="widget" >
                <></>
              </CommitmentOld>
            </BalancesDataProvider>
          </DepositMethodProvider>
        </TimerProvider>
      </SwapDataProvider >
    </Layout>
  </>)
}

export const getServerSideProps = async (ctx) => {
  const app = ctx.query?.appName || ctx.query?.addressSource
  const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
  LayerSwapApiClient.apiKey = apiKey
  const apiClient = new LayerSwapApiClient()
  const { data: networkData } = await apiClient.GetLSNetworksAsync()

  if (!networkData) return

  const settings = {
    networks: networkData,
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

export default CommitmentDetails