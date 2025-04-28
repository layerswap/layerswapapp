import { InferGetServerSidePropsType } from 'next'
import { Swap, LayerswapProvider } from '@layerswap/widget'
import { getServerSideProps } from '../helpers/getSettings';
import Layout from '../components/Layout';
import "@layerswap/widget/index.css"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
  DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import CustomHooks from '../components/CustomHooks';

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout>
      <DynamicContextProvider
        settings={{
          // Find your environment id at https://app.dynamic.xyz/dashboard/developer
          environmentId: "63a881b4-4008-45d7-9697-4a9e743f51d9",
          walletConnectors: [EthereumWalletConnectors],
        }}
      >
        <LayerswapProvider
          integrator='experimental'
          settings={settings}
          version='mainnet'
        >
          <CustomHooks >
            <Swap />
          </CustomHooks>
        </LayerswapProvider>
      </DynamicContextProvider>
    </Layout>
  )
}

export { getServerSideProps };
