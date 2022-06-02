import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';
import { useEffect, useState } from 'react'
import NavRadio, { NavRadioOption } from '../components/navRadio'
import Banner from '../components/banner'


const swapOptions: NavRadioOption[] = [
  { name: "onramp", displayName: 'On-ramp', isEnabled: true, isNew: false },
  { name: "offramp", displayName: 'Off-ramp', isEnabled: true, isNew: true }
];


export default function Home({ data, query, isOfframpEnabled }: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
      else if (isTokenPocket) {
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

  const [swapOption, setSwapOption] = useState(swapOptions[0]);

  return (
    <Layout>
      <div className='flex flex-col space-y-5'>
        <div className='flex flex-col items-center'>
          {
            isOfframpEnabled &&
            <NavRadio selected={swapOption} items={swapOptions} setSelected={setSwapOption}></NavRadio>
          }
          {swapOption.name === "offramp"
            &&
            <div className='flex w-full'>
              <Banner className='mt-2' localStorageId='WarningBetaProduct' desktopMessage='WARNING! Beta product, please use at your own risk' mobileMessage='WARNING! Beta product'></Banner>
            </div>
          }
        </div>
        <Swap swapMode={swapOption.name} settings={data} destNetwork={preSelectedNetwork} destAddress={preSelectedAddress} lockAddress={lockAddress} lockNetwork={lockNetwork} addressSource={addressSource} sourceExchangeName={query.sourceExchangeName} asset={query.asset} />
      </div>
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
    data.networks.forEach((element) => {
      if (!element.is_test_net) networks.push(element);
    });
  }
  else {
    networks = data.networks;
  }

  // Hide bkt and exchange
  data.exchanges = data.exchanges.filter(x => x.id != "b98a09e0-6209-4660-b389-227bac7df080");
  data.currencies = data.currencies.filter(x => x.id != "773d57b3-e7d4-436a-99c0-5fe3c427a115");

  data.networks = networks;
  let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

  return {
    props: { data, query, isOfframpEnabled },
  }
}
