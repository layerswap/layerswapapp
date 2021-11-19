import { useRouter } from 'next/router'
import useSWR from 'swr';
import CardContainer from '../components/cardContainer';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import { SwapInfo } from '../Models/SwapInfo';
import { SwapStatus } from '../Models/SwapStatus';
import { CheckIcon, XIcon } from '@heroicons/react/outline'
import Link from 'next/link'
import SpinIcon from '../components/icons/spinIcon';
import Layout from '../components/layout';
import { useRef, useState } from 'react';
import fs from 'fs';
import path from 'path';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { InferGetServerSidePropsType } from 'next';
import { AxiosError } from "axios";
import React from 'react';
import IntroCard from '../components/introCard';

enum SwapPageStatus {
  Processing,
  Failed,
  Success,
  NotFound
}

const _maxRevalidateCount = 8;

const SwapDetails = ({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();
  const { swapId } = router.query;
  const apiClient = new LayerSwapApiClient();

  const { data, mutate, error, isValidating } = useSWR<SwapInfo>(swapId ? `/swaps/${swapId}` : null, apiClient.apiFetcher);
  const [swapPageStatus, setswapPageStatus] = useState(SwapPageStatus.Processing);
  var checkAndSetStatus = (status: SwapPageStatus) => {
    if (swapPageStatus != status) {
      setswapPageStatus(status);
    }
  }
  const revalidateTimeoutId = useRef<NodeJS.Timeout>();
  const revalidateCount = useRef(0);

  var isLoading = data && (data.status == SwapStatus.Created || data.status == SwapStatus.Pending);
  if (error) {
    var axiosError = error as AxiosError;
    if (axiosError?.response?.status == 404) {
      checkAndSetStatus(SwapPageStatus.NotFound);
    }
    else {
      checkAndSetStatus(SwapPageStatus.Failed)
    }
  }
  else {
    if (data) {
      if (data.status == SwapStatus.Failed) {
        checkAndSetStatus(SwapPageStatus.Failed);
      }
      else if ((revalidateCount.current >= _maxRevalidateCount) && isLoading) {
        checkAndSetStatus(SwapPageStatus.Failed);
      }
      else if (isLoading || isValidating) {
        checkAndSetStatus(SwapPageStatus.Processing);
      }
      else {
        checkAndSetStatus(SwapPageStatus.Success);
      }
    }
    else {
      if (isValidating) {
        checkAndSetStatus(SwapPageStatus.Processing);
      }
    }
  }

  if (data && isLoading) {
    if (isValidating && revalidateTimeoutId) {
      clearTimeout(revalidateTimeoutId.current);
    }
    else {
      if (revalidateCount.current < _maxRevalidateCount) {
        revalidateTimeoutId.current = setTimeout(function () {
          mutate();
          revalidateCount.current++;
        }.bind(this), 5000);
      }
    }
  }

  return (
    <Layout>
      <div className="flex justify-center text-white">
        <div className="flex flex-col justify-center justify-items-center pt-10 px-2">
          <CardContainer className="container mx-auto sm:px-6 lg:px-8 max-w-3xl">
            <div className="py-2 md:px-10">
              <div className="justify-center flex">
                {renderIndicator(swapPageStatus)}
              </div>
              <h3 className="mt-6 text-center text-xl md:text-2xl leading-6 font-medium text-gray-100">
                {renderHeading(swapPageStatus)}
              </h3>
              <div className="mt-3">
                <p className="text-blueGray-300 font-medium text-sm md:text-base max-w-md text-center mx-auto">
                  {renderDescription(swapPageStatus)}
                </p>
              </div>
              <div className="flex flex-col">
                <div className={swapPageStatus === SwapPageStatus.Success ? "block" : "hidden"}>

                  <Link href='/'>
                    <a className="font-medium underline text-indigo-400 hover:text-indigo-500">
                      <p className="mt-2 text-center">Swap more</p>
                    </a>
                  </Link>
                  <a href={settings.networks.filter(x => x.code === data?.network)[0]?.explorer_template.replace("{0}", data?.transaction_id)} className="mt-5 w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                    View in explorer
                  </a>
                </div>
                <div className={(swapPageStatus === SwapPageStatus.Failed || swapPageStatus === SwapPageStatus.NotFound) ? "block" : "hidden"}>
                  <p className={classNames(swapPageStatus === SwapPageStatus.Failed ? "block" : "hidden", "mt-2 text-sm text-center text-gray-300")}><span className="text-base font-medium">Swap Id:</span> {swapId}</p>
                  <a href="https://discord.com/invite/KhwYN35sHy" className="mt-5 w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                    Open Discord
                  </a>
                </div>
              </div>
            </div>
          </CardContainer>
          <IntroCard className="container mx-auto sm:px-6 lg:px-8 max-w-3xl pt-5" />
        </div>
      </div>
    </Layout>
  )
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function renderIndicator(swapPageStatus: SwapPageStatus) {
  let baseBackground = "mx-auto flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-full sm:mx-0 ";
  let baseIcon = "h-8 w-8 md:h-16 md:w-16 ";
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound:
    case SwapPageStatus.Failed: {
      return <div className={baseBackground + 'bg-red-100'}>
        <XIcon className={baseIcon + "text-red-500"} />
      </div>;
    }
    default:
    case SwapPageStatus.Processing: {
      return <div className={baseBackground + 'bg-green-500'}>
        <SpinIcon className={baseIcon + "text-green-100 animate-spin"} />
      </div>;
    }
    case SwapPageStatus.Success: {
      return <div className={baseBackground + 'bg-green-500'}>
        <CheckIcon className={baseIcon + "text-green-100"} />
      </div>;
    }
  }
}

function renderHeading(swapPageStatus: SwapPageStatus) {
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound: {
      return "Swap not found.";
    }
    case SwapPageStatus.Failed: {
      return "Something went wrong.";
    }
    default:
    case SwapPageStatus.Processing: {
      return "Processing...";
    }
    case SwapPageStatus.Success: {
      return "Swap successful";
    }
  }
}

function renderDescription(swapPageStatus: SwapPageStatus) {
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound: {
      return "Ooops looks like you landed on a wrong page. If you believe that's not the case plase contact us through our Discord";
    }
    case SwapPageStatus.Failed: {
      return "We are sorry but there was an issue with your swap. Please contact us through our Discord";
    }
    default:
    case SwapPageStatus.Processing: {
      return "We are submitting your transaction to the network.You'll see the transaction id when it's picked up by a miner.";
    }
    case SwapPageStatus.Success: {
      return "Your swap successfully completed. You can view it in the explorer, or go ahead swap more!"
    }
  }
}

const CACHE_PATH = ".settings";

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

  let settings: LayerSwapSettings;
  try {
    settings = JSON.parse(
      fs.readFileSync(path.join(__dirname, CACHE_PATH), 'utf8')
    )
  } catch (error) {
    console.log('Cache not initialized')
  }

  if (!settings) {
    var apiClient = new LayerSwapApiClient();
    const data = await apiClient.fetchSettingsAsync()

    try {
      fs.writeFileSync(
        path.join(__dirname, CACHE_PATH),
        JSON.stringify(data),
        'utf8'
      )
      console.log('Wrote to settings cache')
    } catch (error) {
      console.log('ERROR WRITING SETTINGS CACHE TO FILE')
      console.log(error)
    }

    settings = data
  }

  return {
    props: {
      settings,
    },
  }
}

export default SwapDetails