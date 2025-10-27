import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { LayerswapProvider, TransactionsHistory } from '@layerswap/widget';
import Layout from '../components/layout';
import { EVMProvider } from "@layerswap/wallet-evm";
import { FuelProvider } from "@layerswap/wallet-fuel";
import { ParadexProvider } from "@layerswap/wallet-paradex";
import { StarknetProvider } from "@layerswap/wallet-starknet";
import { BitcoinProvider } from "@layerswap/wallet-bitcoin";
import { ImmutableXProvider } from "@layerswap/wallet-imtblX";
import { TonProvider } from "@layerswap/wallet-ton";
import { SVMProvider } from "@layerswap/wallet-svm";
import { TronProvider } from "@layerswap/wallet-tron";
import { ImtblPassportProvider } from "@layerswap/wallet-imtblPassport";

const walletProviders = [EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider];

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <LayerswapProvider config={{ theme: themeData, apiKey, settings }} walletProviders={walletProviders}>
          <TransactionsHistory />
        </LayerswapProvider>
      </Layout>
    </>
  )
}

export { getServerSideProps };