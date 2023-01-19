import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { SwapItem } from "../../lib/layerSwapApiClient"
import SpinIcon from "../icons/spinIcon"
import { ArrowRightIcon, ChevronRightIcon, ExternalLinkIcon, RefreshIcon, SelectorIcon, XIcon } from '@heroicons/react/outline';
import SwapDetails from "./SwapDetailsComponent"
import LayerswapMenu from "../LayerswapMenu"
import { useSettingsState } from "../../context/settings"
import Image from 'next/image'
import { useAuthState } from "../../context/authContext"
import shortenAddress from "../utils/ShortenAddress"
import { classNames } from "../utils/classNames"
import SubmitButton, { DoubleLineText } from "../buttons/submitButton"
import CopyButton from "../buttons/copyButton"
import { SwapHistoryComponentSceleton } from "../Sceletons"
import GoHomeButton from "../utils/GoHome"
import StatusIcon, { GreenIcon, GreyIcon } from "./StatusIcons"
import Modal from "../modalComponent"
import toast from "react-hot-toast"
import { ArrowLeftIcon } from "@heroicons/react/solid"
import { useSwapDataUpdate } from "../../context/swap"
import { SwapStatus } from "../../Models/SwapStatus"
import FormattedDate from "../Common/FormattedDate";
import { GetSourceDestinationData } from "../../helpers/swapHelper";
import useSortableData from "../../hooks/useSortableData";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import isGuid from "../utils/isGuid";
import NetworkSettings from "../../lib/NetworkSettings";

function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const settings = useSettingsState()
  const { currencies, exchanges, networks, discovery: { resource_storage_url } } = settings
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<SwapItem[]>()
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
  const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
  const { email } = useAuthState()
  const { cancelSwap } = useSwapDataUpdate()
  const canCompleteCancelSwap = selectedSwap?.status == SwapStatus.UserTransferPending
  const { width } = useWindowDimensions()

  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  useEffect(() => {
    (async () => {
      setIsLastPage(false)
      setLoading(true)

      const layerswapApiClient = new LayerSwapApiClient(router, '/transactions')
      const { data, error } = await layerswapApiClient.GetSwapsAsync(1)

      if (error) {
        toast.error(error.message);
        return;
      }

      setSwaps(data)
      setPage(1)
      if (data?.length < 5)
        setIsLastPage(true)

      setLoading(false)
    })()
  }, [router.query])

  const handleLoadMore = useCallback(async () => {
    //TODO refactor page change
    const nextPage = page + 1
    setLoading(true)
    const layerswapApiClient = new LayerSwapApiClient(router, '/transactions')
    const { data, error } = await layerswapApiClient.GetSwapsAsync(nextPage)

    if (error) {
      toast.error(error.message);
      return;
    }

    setSwaps(old => [...(old ? old : []), ...(data ? data : [])])
    setPage(nextPage)
    if (data.length < 5)
      setIsLastPage(true)

    setLoading(false)
  }, [page, setSwaps])

  const handleopenSwapDetails = (swap: SwapItem) => {
    setSelectedSwap(swap)
    setOpenSwapDetailsModal(true)
  }

  const handleOpenSwapDetailsInMobile = (swap: SwapItem) => {
    if (width < 1024) {
      setSelectedSwap(swap)
      setOpenSwapDetailsModal(true)
    }
  }

  const { items, requestSort, sortConfig } = useSortableData(swaps);
  const getStatusIcon = (name) => {
    if (!sortConfig) {
      return <SelectorIcon className="h-3" />;
    }
    return sortConfig.key === name ? (sortConfig.direction == 'ascending' ? <GreyIcon /> : <GreenIcon />) : undefined;
  };

  return (
    <div className='bg-darkblue px-8 md:px-12 md:mb-12 md:shadow-card rounded-lg min-h-[500px] w-full overflow-hidden relative h-full '>
      <div className="mt-3 flex items-center justify-between z-20" >
        <div className="flex ">
          <button onClick={handleGoBack} className="self-start md:mt-2">
            <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
          </button>
          <div className="hidden md:block ml-4">
            <p className="text-2xl font-bold relative">Account</p>
            <span className="text-primary-text font-medium absolute">{email}</span>
          </div>
        </div>

        <div className='mx-auto px-4 overflow-hidden md:hidden'>
          <div className="flex justify-center imxMarketplace:hidden">
            <GoHomeButton />
          </div>
        </div>
        <LayerswapMenu />
      </div>
      {
        page == 0 && loading ?
          <SwapHistoryComponentSceleton />
          : <>
            {
              swaps?.length > 0 ?
                <div className="w-full flex flex-col justify-between h-full space-y-5 text-primary-text">
                  <div className="mb-2">
                    <div className="-mx-4 mt-10 sm:-mx-6 md:mx-0 md:rounded-lg">
                      <table className="w-full divide-y divide-darkblue-500">
                        <thead className="text-primary-text">
                          <tr>
                            <th
                              scope="col"
                              className="hidden pr-3 py-3.5 text-left text-sm font-semibold  lg:table-cell"
                            >
                              Id
                            </th>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold  sm:pl-6">
                              <div className="hidden lg:block">
                                From
                              </div>
                              <div className="block lg:hidden">
                                Swap details
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold  lg:table-cell"
                            >
                              To
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold  "
                            >
                              Amount
                            </th>
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold  lg:table-cell"
                            >
                              Transaction
                            </th>
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold  lg:table-cell"
                            >
                              <button
                                onClick={() => requestSort('status')}
                                className='flex items-center gap-1'
                              >
                                <span>Status</span>
                                <span>{getStatusIcon('status')}</span>
                              </button>
                            </th>
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold  lg:table-cell"
                            >
                              Date
                            </th>
                            <th scope="col" className="hidden lg:table-cell relative py-3.5 pl-3 pr-4 sm:pr-6">
                              <span className="sr-only">More</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items?.map((swap, index) => {

                            const { destination, destination_network, destination_logo, source, source_logo } = GetSourceDestinationData({ swap, currencies, exchanges, networks, resource_storage_url })

                            return <tr onClick={() => handleOpenSwapDetailsInMobile(swap)} key={swap.id}>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'hidden pr-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                <div className='inline-flex items-center'>
                                  <CopyButton iconClassName="text-primary-text" toCopy={swap.id}>
                                    {shortenAddress(swap.id)}
                                  </CopyButton>
                                </div>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'relative px-3.5 pl-4 sm:pl-6 py-3.5 text-sm text-white table-cell'
                                )}
                              >
                                <div className="text-white flex items-center">
                                  <div className="flex-shrink-0 h-5 w-5 relative">
                                    {
                                      <Image
                                        src={source_logo}
                                        alt="From Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                  <div className="mx-1 hidden lg:block">{source.display_name}</div>
                                  <ArrowRightIcon className="h-4 w-4 lg:hidden mx-2" />
                                  <div className="flex-shrink-0 h-5 w-5 relative block lg:hidden">
                                    {
                                      <Image
                                        src={destination_logo}
                                        alt="To Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center text-white lg:hidden">
                                  <FormattedDate date={swap.created_date} />
                                </div>
                                {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-500" /> : null}
                                <span className="flex items-center lg:hidden">
                                  {<StatusIcon status={swap.status} />}
                                  {/* {plan.from} - {plan.to} */}
                                </span>

                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-5 w-5 relative">
                                    {
                                      <Image
                                        src={destination_logo}
                                        alt="To Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                  <div className="ml-1">{destination.display_name}</div>
                                </div>

                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'px-3 py-3.5 text-sm text-white table-cell'
                                )}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="">
                                    {
                                      swap?.status == 'completed' ?
                                        <span className="ml-1 md:ml-0">
                                          {swap.output_transaction?.amount}
                                        </span>
                                        :
                                        <span>
                                          {swap.requested_amount}
                                        </span>
                                    }
                                    <span className="ml-1">{swap.destination_network_asset}</span>
                                  </div>
                                  <ChevronRightIcon className="h-5 w-5 lg:hidden" />
                                </div>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                {(swap?.output_transaction?.transaction_id && !isGuid(swap?.output_transaction?.transaction_id)) ?
                                  <>
                                    <div className="underline hover:no-underline">
                                      <a target={"_blank"} href={NetworkSettings.KnownSettings[destination_network.internal_name].TransactionExplorerTemplate?.replace("{0}", swap.output_transaction.transaction_id)}>{shortenAddress(swap.output_transaction.transaction_id)}</a>
                                    </div>
                                  </>
                                  : <div>-</div>
                                }
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'relative px-3 py-3.5 text-sm text-white hidden lg:table-cell group'
                                )}
                              >
                                {<StatusIcon status={swap.status} />}

                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                                )}
                              >
                                {(new Date(swap.created_date)).toLocaleString()}
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-transparent',
                                  'hidden lg:table-cell relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium'
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleopenSwapDetails(swap)}
                                  className="group text-white  relative w-full flex justify-center py-2 px-2 border-0 font-semibold rounded-md transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
                                >
                                  <ChevronRightIcon className="h-5 w-5" />
                                </button>
                                {index !== 0 ? <div className="absolute right-6 left-0 -top-px h-px bg-darkblue-500" /> : null}
                              </td>
                            </tr>
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-white text-sm mt-auto flex justify-center">
                    {
                      !isLastPage &&
                      <button
                        disabled={isLastPage || loading}
                        type="button"
                        onClick={handleLoadMore}
                        className="group disabled:text-primary-800 mb-2 text-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
                      >
                        <span className="flex items-center mr-2">
                          {(!isLastPage && !loading) &&
                            <RefreshIcon className="h-5 w-5" />}
                          {loading ?
                            <SpinIcon className="animate-spin h-5 w-5" />
                            : null}
                        </span>
                        Load more
                      </button>
                    }
                  </div>
                  <Modal showModal={openSwapDetailsModal} setShowModal={setOpenSwapDetailsModal} title={<p className="text-2xl text-white font-semibold">Swap details</p>} modalSize='medium'>
                    <div>
                      <SwapDetails id={selectedSwap?.id} />
                      {
                        canCompleteCancelSwap &&
                        <div className="text-white text-sm mt-6 space-y-3">
                          <div className="flex flex-row text-white text-base space-x-2">
                            <div className='basis-1/3'>
                              <SubmitButton text_align="left" buttonStyle="outline" onClick={async () => { await cancelSwap(selectedSwap.id); router.reload() }} isDisabled={false} isSubmitting={false} icon={<XIcon className='h-5 w-5' />}>
                                <DoubleLineText
                                  colorStyle='mltln-text-dark'
                                  primaryText='Cancel'
                                  secondarytext='the swap'
                                  reversed={true}
                                />
                              </SubmitButton>
                            </div>
                            <div className='basis-2/3'>
                              <SubmitButton button_align='right' text_align="left" onClick={() => router.push(`/swap/${selectedSwap.id}`)} isDisabled={false} isSubmitting={false} icon={<ExternalLinkIcon className='h-5 w-5' />}>
                                <DoubleLineText
                                  colorStyle='mltln-text-light'
                                  primaryText="Complete"
                                  secondarytext='the swap'
                                  reversed={true}
                                />
                              </SubmitButton>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </Modal>
                </div>
                : <div className="absolute top-1/2 right-0 text-center w-full">
                  There are no transactions for this account
                </div>
            }
          </>
      }
    </div>
  )
}

export default TransactionsHistory;
