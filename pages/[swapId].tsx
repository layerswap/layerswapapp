import { useRouter } from 'next/router'
import useSWR from 'swr';
import CardContainer from '../components/cardContainer';
import LayerSwapApiClient from '../layerSwapApiClient';
import { SwapInfo } from '../Models/SwapInfo';
import { SwapStatus } from '../Models/SwapStatus';
import { CheckIcon, XIcon } from '@heroicons/react/outline'
import { CryptoNetwork } from '../Models/CryptoNetwork';
import Link from 'next/link'

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
    <CardContainer>
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
            <div className="mb-6">
              <a className="font-medium hover:underline text-indigo-600 hover:text-indigo-500" href={CryptoNetwork.GetLayerTwoByName(data.network).explorerUrl + data.transaction_id}>
                <p className="truncate mt-3 ">{data.transaction_id}</p>
              </a>
              <Link href="/">
                <a className="mt-3 w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10">
                  Swap more
                </a>
              </Link>
            </div>
          }
        </div>
      </div>
    </CardContainer>
  )
}

function renderIndicator(swapPageStatus: SwapPageStatus) {
  switch (swapPageStatus) {
    case SwapPageStatus.Failed: {
      return <div className="mx-auto flex items-center justify-center  h-24 w-24 rounded-full bg-red-100 sm:mx-0 sm:h-24 sm:w-24">
        <XIcon className="text-red-500 h-16 w-16" />
      </div>;
    }
    default:
    case SwapPageStatus.Processing: {
      return <div className="mx-auto flex items-center justify-center  h-24 w-24 rounded-full bg-green-100 sm:mx-0 sm:h-24 sm:w-24">
        <svg className="animate-spin h-16 w-16 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>;
    }
    case SwapPageStatus.Success: {
      return <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 md:mx-0 sm:h-24 sm:w-24">
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