import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';
import { useEffect, useState } from 'react'

export default function Home({ data, query }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { activate, active, account, chainId } = useWeb3React<Web3Provider>();

  let preSelectedNetwork: string = query.destNetwork;
  let lockNetwork: boolean = query.lockNetwork;
  let preSelectedAddress: string = query.destAddress;
  let lockAddress: boolean = query.lockAddress;

  const [addressSource, setAddressSource] = useState(query.addressSource);

  useEffect(() => {
    let isImtoken = (window as any)?.ethereum?.isImToken !== undefined;
    let isTokenPocket = (window as any)?.ethereum?.isTokenPocket !== undefined;

    if (isImtoken || isTokenPocket) {
      if (isImtoken) {
        setAddressSource("imtoken");
      }
      else if (isTokenPocket)
      {
        setAddressSource("tokenpocket");
      }
      let supportedNetworks = data.networks.filter(x => x.chain_id != -1 && x.is_enabled);
      const injected = new InjectedConnector({
        // Commented to allow visitors from other networks to use this page
        //supportedChainIds: supportedNetworks.map(x => x.chain_id)
      });

      if (!active) {
        activate(injected, onerror => {
          if (onerror.message.includes('user_canceled')) {
            return alert('You canceled the operation, please refresh and try to reauthorize.')
          }
          else if (onerror.message.includes('Unsupported chain')) {
            // Do nothing
          }
          else {
            alert(`Failed to connect: ${onerror.message}`)
          }
        });
      }
    }
  })

  if (chainId) {
    let network = data.networks.find(x => x.chain_id == chainId);
    if (network) {
      preSelectedNetwork = network.code;
      lockNetwork = true;
    }
  }

  if (account) {
    preSelectedAddress = account;
    lockAddress = true;
  }

  return (
    <Layout>
      <main>
        <Swap settings={data} destNetwork={preSelectedNetwork} destAddress={preSelectedAddress} lockAddress={lockAddress} lockNetwork={lockNetwork} addressSource={addressSource} sourceExchangeName={query.sourceExchangeName} asset={query.asset} />
      </main>
    </Layout>
  )
}

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  var query = context.query;
  var apiClient = new LayerSwapApiClient();
  const data = await apiClient.fetchSettingsAsync()
  var networks: CryptoNetwork[] = [];
  if (!process.env.IS_TESTING) {
    data.networks.forEach((element, index) => {
      if (!element.is_test_net) networks.push(element);
    });
  }
  else {
    networks = data.networks;
  }

  data.networks = networks;

  return {
    props: { data, query },
  }
}
