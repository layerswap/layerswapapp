import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { LayerswapProvider, TransactionsHistory } from '@layerswap/widget';
import Layout from '../components/layout';
import { EVMProvider, FuelProvider, ParadexProvider, StarknetProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider } from "@layerswap/wallets";

const walletProviders = [EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider];

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <LayerswapProvider
          config={{
            theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: true, hidePoweredBy: true },
            apiKey,
            settings
          }}
          walletProviders={walletProviders}
        >
          <TransactionsHistory />
        </LayerswapProvider>
      </Layout>
    </>
  )
}

export { getServerSideProps };