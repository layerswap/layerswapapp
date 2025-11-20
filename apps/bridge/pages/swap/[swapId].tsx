import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { getThemeData } from '../../helpers/settingsHelper';
import { SwapWithdrawal } from '@layerswap/widget';
import { LayerswapApiClient } from '@layerswap/widget/internal';
import Layout from '../../components/layout';
import {
  createEVMProvider,
  createStarknetProvider,
  createFuelProvider,
  createParadexProvider,
  createBitcoinProvider,
  createImmutableXProvider,
  createTONProvider,
  createSVMProvider,
  createTronProvider,
  createImmutablePassportProvider
} from "@layerswap/wallets";
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import { ZKsyncProvider } from '@layerswap/wallet-zksync';
import { LoopringProvider } from '@layerswap/wallet-loopring';



const SwapDetails = ({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter()

  const walletConnectConfigs = {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://layerswap.io/app/',
    icons: ['https://www.layerswap.io/app/symbol.png']
  }

  const imtblPassportConfig = typeof window !== 'undefined' ? {
    clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
    publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
    redirectUri: router.basePath ? `${window.location.origin}${router.basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`,
    logoutRedirectUri: router.basePath ? `${window.location.origin}${router.basePath}/` : `${window.location.origin}/`
  } : undefined

  const walletProviders = [
    createEVMProvider({ walletConnectConfigs, walletProviderModules: [ZKsyncProvider, LoopringProvider] }),
    createStarknetProvider({ walletConnectConfigs }),
    createFuelProvider(),
    createParadexProvider(),
    createBitcoinProvider(),
    createImmutableXProvider(),
    createTONProvider({
      tonConfigs: {
        manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
        tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || ''
      }
    }),
    createSVMProvider({ walletConnectConfigs }),
    createTronProvider(),
    createImmutablePassportProvider({ imtblPassportConfig })
  ];

  return (<>
    <Layout settings={settings || undefined} themeData={themeData}>
      <SwapWithdrawal
        config={{
          theme: {
            ...themeData,
            borderRadius: 'default',
            enablePortal: true,
            enableWideVersion: true,
            hidePoweredBy: true
          },
          apiKey,
          settings,
          initialValues: {
            swapId: router.query.swapId?.toString()!
          }
        }}
        callbacks={{
          onBackClick() {
            router.push({
              pathname: "/",
              query: { ...resolvePersistantQueryParams(router.query) }
            })
          }
        }}
        walletProviders={walletProviders}
      />
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

export default SwapDetails