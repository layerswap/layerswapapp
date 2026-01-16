import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { getThemeData } from '../../helpers/settingsHelper';
import { SwapWithdrawal } from '@layerswap/widget';
import { LayerswapApiClient } from '@layerswap/widget/internal';
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import WidgetWrapper from '../../components/WidgetWrapper';



const SwapDetails = ({ settings, themeData, apiKey, swapData }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()

  return (<>
    <Layout settings={settings || undefined} themeData={themeData}>
      <WidgetWrapper
        settings={settings}
        themeData={themeData}
        apiKey={apiKey}
        configOverrides={{
          initialValues: { swapId: router.query.swapId?.toString()! }
        }}
        callbacks={{
          onBackClick() {
            router.push({
              pathname: "/",
              query: { ...resolvePersistantQueryParams(router.query) }
            })
          }
        }}
      >
        <SwapWithdrawal initialSwapData={swapData} />
      </WidgetWrapper>
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
  const app = ctx.query?.appName || ctx.query?.addressSource
  const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
  LayerswapApiClient.apiKey = apiKey
  const apiClient = new LayerswapApiClient()
  const { data: networkData } = await apiClient.GetLSNetworksAsync()

  const { data: swapData } = await apiClient.GetSwapAsync(params.swapId)

  if (swapData?.swap.transactions.length == 0) {
    return {
      redirect: {
        destination: `/?from=${swapData?.swap.source_network.name}&to=${swapData?.swap.destination_network.name}&fromAsset=${swapData?.swap.source_token.symbol}&toAsset=${swapData?.swap.destination_token.symbol}&amount=${swapData?.swap.requested_amount}`,
        permanent: true,
      }
    }
  }

  if (!networkData) return

  const settings = {
    networks: networkData,
  }

  const themeData = await getThemeData(ctx.query)

  return {
    props: {
      settings,
      themeData,
      apiKey,
      swapData: swapData || null
    }
  }
}

export default SwapDetails