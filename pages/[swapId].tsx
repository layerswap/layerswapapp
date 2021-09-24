import { useRouter } from 'next/router'
import useSWR from 'swr';
import CardContainer from '../components/cardContainer';
import LayerSwapApiClient from '../layerSwapApiClient';
import { SwapInfo } from '../Models/SwapInfo';
import { SwapStatus } from '../Models/SwapStatus';
import { CheckIcon, XIcon } from '@heroicons/react/outline'
import { CryptoNetwork } from '../Models/CryptoNetwork';
import Link from 'next/link'
import SpinIcon from '../components/icons/spinIcon';
import Layout from '../components/layout';

enum SwapPageStatus {
  Processing,
  Failed,
  Success
}

const SwapDetails = () => {
  const router = useRouter();
  const { swapId } = router.query;
  const apiClient = new LayerSwapApiClient();

  const { data, mutate, error, isValidating } = useSWR<SwapInfo>(swapId ? `/swaps/${swapId}` : null, apiClient.apiFetcher);
  let swapPageStatus = SwapPageStatus.Processing;

  if (error || (data && data.status == SwapStatus.Failed)) {
    swapPageStatus = SwapPageStatus.Failed;
  }
  else if ((!data || isValidating) || data.status == SwapStatus.Created || data.status == SwapStatus.Pending) {
    swapPageStatus = SwapPageStatus.Processing;

  }
  else {
    swapPageStatus = SwapPageStatus.Success;
  }

  if (data && (data.status == SwapStatus.Created || data.status == SwapStatus.Pending)) {
    setTimeout(function () {
      mutate()
    }.bind(this), 5000)
  }

  return (
    <Layout>
      <CardContainer>
        <div className="w-96 max-w-7xl m-10">
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
              {swapPageStatus === SwapPageStatus.Success &&
                <div className="my-6">

                  <a href={CryptoNetwork.GetLayerTwoByName(data.network).explorerUrl + data.transaction_id} className="mt-5 relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                    View transaction in explorer
                  </a>

                  <Link href='/'>
                    <a className="font-medium underline text-indigo-600 hover:text-indigo-500">
                      <p className="truncate mt-3 ">Swap more</p>
                    </a>
                  </Link>

                </div>
              }
            </div>
          </div>
        </div>
      </CardContainer>
    </Layout>
  )
}

function renderIndicator(swapPageStatus: SwapPageStatus) {
  switch (swapPageStatus) {
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
    case SwapPageStatus.Failed: {
      return "We are sorry but there was an issue with your swap. We are on it, but if you want you can contact us by ...";
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

export default SwapDetails