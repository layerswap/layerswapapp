import Layout from '../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { Swap, LayerswapContext } from '@layerswap/widget'
import CustomHooks from '../components/CustomHooks'
import {
  DynamicContextProvider,
  DynamicWidget,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout settings={settings} themeData={themeData}>
      <DynamicContextProvider
        settings={{
          // Find your environment id at https://app.dynamic.xyz/dashboard/developer
          environmentId: "2762a57b-faa4-41ce-9f16-abff9300e2c9",
          walletConnectors: [EthereumWalletConnectors],
        }}
      >
        <LayerswapContext
          integrator='experimental'
          apiKey={apiKey}
          settings={settings}
          themeData={themeData}
        >
          <CustomHooks>
            <Swap 
              featuredNetwork={{
                initialDirection: 'from',
                network: 'ETHEREUM_MAINNET',
                oppositeDirectionOverrides: 'onlyExchanges',
              }}
            />
          </CustomHooks>
        </LayerswapContext>
      </DynamicContextProvider>
    </Layout>
  )
}

export { getServerSideProps };
