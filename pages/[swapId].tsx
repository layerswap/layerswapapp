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
      <div className="flex justify-center pt-10">
        <CardContainer className="md:w-10/12 md:max-w-xl lg:max-w-2xl">
          <div className="py-14">
            <div className="max-w-md mx-auto items-center justify-center flex">
              {renderIndicator(swapPageStatus)}
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-2xl leading-6 font-medium text-gray-900">
                {renderHeading(swapPageStatus)}
              </h3>
              <div className="mt-3 h-24">
                <p className="text-gray-500 font-medium">
                  {renderDescription(swapPageStatus)}
                </p>
                <div className="my-6 flex flex-col">
                  {swapPageStatus === SwapPageStatus.Success &&
                    <div>
                      <a href={settings.networks.filter(x => x.code === data.network)[0].explorer_template.replace("{0}", data.transaction_id)} className="mt-5 w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                        View transaction in explorer
                      </a>
                      <Link href='/'>
                        <a className="font-medium underline text-indigo-600 hover:text-indigo-500">
                          <p className="mt-2">Swap more</p>
                        </a>
                      </Link>
                    </div>
                  }
                  {(swapPageStatus === SwapPageStatus.Failed || swapPageStatus === SwapPageStatus.NotFound) &&
                    <div>
                      {swapPageStatus === SwapPageStatus.Failed &&
                        <p className="text-sm text-gray-700 "><span className="text-base font-medium">Swap Id:</span> {swapId}</p>
                      }
                      <a href="https://discord.com/invite/KhwYN35sHy" className="mt-5 w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                        Open Discord
                      </a>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContainer>
      </div>
    </Layout>
  )
}

function renderIndicator(swapPageStatus: SwapPageStatus) {
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound:
    case SwapPageStatus.Failed: {
      return <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 sm:mx-0">
        <XIcon className="text-red-500 h-16 w-16" />
      </div>;
    }
    default:
    case SwapPageStatus.Processing: {
      return <div className="mx-auto flex items-center justify-center  h-24 w-24 rounded-full bg-green-100 sm:mx-0">
        <SpinIcon className="animate-spin h-16 w-16 text-green-500" />
      </div>;
    }
    case SwapPageStatus.Success: {
      return <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 md:mx-0">
        <CheckIcon className="text-green-500 h-16 w-16" />
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
      return "Success";
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
      return "Your swap successfully completed."
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