import Image from 'next/image'
import { truncateDecimals } from "../utils/RoundDecimals";
import { FC } from 'react';
import { SwapItem, TransactionType } from '../../lib/layerSwapApiClient';
import shortenAddress from '../utils/ShortenAddress';
import StatusIcon from '../SwapHistory/StatusIcons';

type Props = {
  swapItem: SwapItem
}

const Transaction: FC<Props> = ({
  swapItem
}: Props) => {
  const {
    source_network,
    destination_network,
    destination_token,
    source_token,
    requested_amount,
    source_exchange,
    destination_exchange,
  } = swapItem
  const swapInputTransaction = swapItem?.transactions?.find(t => t.type === TransactionType.Input)
  const swapOutputTransaction = swapItem.transactions.find(t => t.type === TransactionType.Output)

  return (
    <div className="relative text-primary-text flex flex-col bg-secondary-700 rounded-md p-2 border-2 border-secondary-500">
      <div className="text-primary-text flex gap-6">
        <div className="h-12 w-12 relative">
        {source_network &&
          <>
            <Image
              src={source_exchange?.logo || source_network.logo}
              alt="Source Logo"
              height="160"
              width="160"
              className="rounded-md pb-1 pr-1"
            />
            <Image
              src={source_token?.logo}
              alt="Source Logo"
              height="20"
              width="20"
              className="absolute bottom-0 right-0 rounded-md"
            />
          </>
        }
        </div>
          <div>
            <div className="text-2xl text-primary-text">
              <span>
              {truncateDecimals(requested_amount, source_token?.precision)}
              </span>
              <span className="ml-1">{source_token?.symbol}</span>
            </div>
            <div className="text-sm text-secondary-text">
              {destination_network.display_name} - {swapInputTransaction && shortenAddress(swapInputTransaction.transaction_hash)}
            </div>
          </div>
      </div>
      <div className="flex justify-center w-11">
        <div className="w-0.5 h-5 bg-gray-500 mt-1 mb-2" />
      </div>
      <div className="text-primary-text flex gap-6 items-center">
        <div className="h-12 w-12 relative">
        {destination_network &&
          <>
            <Image
              src={destination_exchange?.logo || destination_network.logo}
              alt="Destination Logo"
              height="160"
              width="160"
              className="rounded-md pb-1 pr-1"
            />
            <Image
              src={destination_token.logo}
                alt="Destination Logo"
                height="20"
                width="20"
                className="absolute bottom-0 right-0 rounded-md"
              />
          </>
        }
        </div>
        {
          swapOutputTransaction ?
          <div>
            <div className="text-2xl text-primary-text">
              <span>
              {truncateDecimals(swapOutputTransaction?.amount, source_token?.precision)}
              </span>
              <span className="ml-1">{destination_token?.symbol}</span>
            </div>
            <div className="text-sm text-secondary-text">
              {destination_network.display_name} - {shortenAddress(swapOutputTransaction.transaction_hash)}
            </div>
          </div>
          : '-'
        }
      </div>
      <div className="absolute bottom-2 right-2 pl-5 bg-secondary-700">
          <StatusIcon swap={swapItem} />
      </div>
    </div>
  )
}

export default Transaction;
