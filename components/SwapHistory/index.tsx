import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { SwapItem, SwapStatusInNumbers, TransactionType } from "../../lib/layerSwapApiClient"
import SpinIcon from "../icons/spinIcon"
import { ArrowRight, ChevronRight, ExternalLink, RefreshCcw, Scroll, X } from 'lucide-react';
import SwapDetails from "./SwapDetailsComponent"
import { useSettingsState } from "../../context/settings"
import Image from 'next/image'
import { classNames } from "../utils/classNames"
import SubmitButton, { DoubleLineText } from "../buttons/submitButton"
import { SwapHistoryComponentSceleton } from "../Sceletons"
import StatusIcon, { } from "./StatusIcons"
import toast from "react-hot-toast"
import { SwapStatus } from "../../Models/SwapStatus"
import ToggleButton from "../buttons/toggleButton";
import Modal from "../modal/modal";
import HeaderWithMenu from "../HeaderWithMenu";
import Link from "next/link";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import AppSettings from "../../lib/AppSettings";
import { truncateDecimals } from "../utils/RoundDecimals";

function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const settings = useSettingsState()
  const { exchanges, networks, currencies, resolveImgSrc } = settings
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<SwapItem[]>()
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
  const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
  const canCompleteCancelSwap = selectedSwap?.status == SwapStatus.UserTransferPending
  const [showAllSwaps, setShowAllSwaps] = useState(false)
  const [showToggleButton, setShowToggleButton] = useState(false)

  const PAGE_SIZE = 20

  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  useEffect(() => {
    (async () => {
      const layerswapApiClient = new LayerSwapApiClient(router, '/transactions')
      const { data } = await layerswapApiClient.GetSwapsAsync(1, SwapStatusInNumbers.Cancelled)
      if (data?.length > 0) setShowToggleButton(true)
    })()
  }, [])

  useEffect(() => {
    (async () => {
      setIsLastPage(false)
      setLoading(true)
      const layerswapApiClient = new LayerSwapApiClient(router, '/transactions')

      if (showAllSwaps) {
        const { data, error } = await layerswapApiClient.GetSwapsAsync(1)

        if (error) {
          toast.error(error.message);
          return;
        }

        setSwaps(data)
        setPage(1)
        if (data?.length < PAGE_SIZE)
          setIsLastPage(true)

        setLoading(false)

      } else {

        const { data, error } = await layerswapApiClient.GetSwapsAsync(1, SwapStatusInNumbers.SwapsWithoutCancelledAndExpired)

        if (error) {
          toast.error(error.message);
          return;
        }

        setSwaps(data)
        setPage(1)
        if (data?.length < PAGE_SIZE)
          setIsLastPage(true)
        setLoading(false)
      }
    })()
  }, [router.query, showAllSwaps])

  const handleLoadMore = useCallback(async () => {
    //TODO refactor page change
    const nextPage = page + 1
    setLoading(true)
    const layerswapApiClient = new LayerSwapApiClient(router, '/transactions')
    if (showAllSwaps) {
      const { data, error } = await layerswapApiClient.GetSwapsAsync(nextPage)

      if (error) {
        toast.error(error.message);
        return;
      }

      setSwaps(old => [...(old ? old : []), ...(data ? data : [])])
      setPage(nextPage)
      if (data.length < PAGE_SIZE)
        setIsLastPage(true)

      setLoading(false)
    } else {
      const { data, error } = await layerswapApiClient.GetSwapsAsync(nextPage, SwapStatusInNumbers.SwapsWithoutCancelledAndExpired)

      if (error) {
        toast.error(error.message);
        return;
      }

      setSwaps(old => [...(old ? old : []), ...(data ? data : [])])
      setPage(nextPage)
      if (data.length < PAGE_SIZE)
        setIsLastPage(true)

      setLoading(false)
    }
  }, [page, setSwaps])

  const handleopenSwapDetails = (swap: SwapItem) => {
    setSelectedSwap(swap)
    setOpenSwapDetailsModal(true)
  }

  const handleToggleChange = (value: boolean) => {
    setShowAllSwaps(value);
  }

  return (
    <div className='bg-secondary-900 sm:shadow-card rounded-lg mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px]'>
      <HeaderWithMenu goBack={handleGoBack} />
      {
        page == 0 && loading ?
          <SwapHistoryComponentSceleton />
          : <>
            {
              swaps?.length > 0 ?
                <div className="w-full flex flex-col justify-between h-full px-6 space-y-5 text-secondary-text">
                  <div className="mt-4">
                    {showToggleButton && <div className="flex justify-end mb-2">
                      <div className='flex space-x-2'>
                        <p className='flex items-center text-xs md:text-sm font-medium'>
                          Show all swaps
                        </p>
                        <ToggleButton onChange={handleToggleChange} value={showAllSwaps} />
                      </div>
                    </div>}
                    <div className="max-h-[450px] styled-scroll overflow-y-auto ">
                      <table className="w-full divide-y divide-secondary-500">
                        <thead className="text-secondary-text">
                          <tr>
                            <th scope="col" className="text-left text-sm font-semibold">
                              <div className="block">
                                Swap details
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold  "
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold  "
                            >
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {swaps?.map((swap, index) => {

                            const { source_exchange: source_exchange_internal_name,
                              destination_network: destination_network_internal_name,
                              source_network: source_network_internal_name,
                              destination_exchange: destination_exchange_internal_name,
                              source_network_asset
                            } = swap

                            const source = source_exchange_internal_name ? exchanges.find(e => e.internal_name === source_exchange_internal_name) : networks.find(e => e.internal_name === source_network_internal_name)
                            const source_currency = currencies?.find(c => c.asset === source_network_asset)
                            const destination_exchange = destination_exchange_internal_name && exchanges.find(e => e.internal_name === destination_exchange_internal_name)
                            const destination = destination_exchange_internal_name ? destination_exchange : networks.find(n => n.internal_name === destination_network_internal_name)

                            return <tr onClick={() => handleopenSwapDetails(swap)} key={swap.id}>

                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-secondary-500',
                                  'relative text-sm text-primary-text table-cell'
                                )}
                              >
                                <div className="text-primary-text flex items-center">
                                  <div className="flex-shrink-0 h-5 w-5 relative">
                                    {
                                      <Image
                                        src={resolveImgSrc(source)}
                                        alt="From Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                  <ArrowRight className="h-4 w-4 mx-2" />
                                  <div className="flex-shrink-0 h-5 w-5 relative block">
                                    {
                                      <Image
                                        src={resolveImgSrc(destination)}
                                        alt="To Logo"
                                        height="60"
                                        width="60"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                </div>
                                {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-secondary-500" /> : null}

                              </td>
                              <td className={classNames(
                                index === 0 ? '' : 'border-t border-secondary-500',
                                'relative text-sm table-cell'
                              )}>
                                <span className="flex items-center">
                                  {swap && <StatusIcon swap={swap} />}
                                </span>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-secondary-500',
                                  'px-3 py-3.5 text-sm text-primary-text table-cell'
                                )}
                              >
                                <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { handleopenSwapDetails(swap); e.preventDefault() }}>
                                  <div className="">
                                    {
                                      swap?.status == 'completed' ?
                                        <span className="ml-1 md:ml-0">
                                          {truncateDecimals(swap.transactions.find(t => t.type === TransactionType.Output)?.amount, source_currency?.precision)}
                                        </span>
                                        :
                                        <span>
                                          {truncateDecimals(swap.requested_amount, source_currency?.precision)}
                                        </span>
                                    }
                                    <span className="ml-1">{swap.destination_network_asset}</span>
                                  </div>
                                  <ChevronRight className="h-5 w-5" />
                                </div>
                              </td>
                            </tr>
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-primary-text text-sm flex justify-center">
                    {
                      !isLastPage &&
                      <button
                        disabled={isLastPage || loading}
                        type="button"
                        onClick={handleLoadMore}
                        className="group disabled:text-primary-800 mb-2 text-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
                      >
                        <span className="flex items-center mr-2">
                          {(!isLastPage && !loading) &&
                            <RefreshCcw className="h-5 w-5" />}
                          {loading ?
                            <SpinIcon className="animate-spin h-5 w-5" />
                            : null}
                        </span>
                        <span>Load more</span>
                      </button>
                    }
                  </div>
                  <Modal height="fit" show={openSwapDetailsModal} setShow={setOpenSwapDetailsModal} header="Swap details">
                    <div className="mt-2">
                      <SwapDetails id={selectedSwap?.id} />
                      {
                        canCompleteCancelSwap &&
                        <div className="text-primary-text text-sm mt-6 space-y-3">
                          <div className="flex flex-row text-primary-text text-base space-x-2">
                            <SubmitButton
                              text_align="center"
                              onClick={() => router.push({
                                pathname: `/swap/${selectedSwap.id}`,
                                query: resolvePersistantQueryParams(router.query)
                              })}
                              isDisabled={false}
                              isSubmitting={false}
                              icon={
                                <ExternalLink
                                  className='h-5 w-5' />
                              }
                            >
                              View swap
                            </SubmitButton>
                          </div>
                        </div>
                      }
                    </div>
                  </Modal>
                </div>
                :
                <div className="absolute top-1/4 right-0 text-center w-full">
                  <Scroll className='h-40 w-40 text-secondary-700 mx-auto' />
                  <p className="my-2 text-xl">It&apos;s empty here</p>
                  <p className="px-14 text-primary-text">You can find all your transactions by searching with address in</p>
                  <Link target="_blank" href={AppSettings.ExplorerURl} className="underline hover:no-underline cursor-pointer hover:text-secondary-text text-primary-text font-light">
                    <span>Layerswap Explorer</span>
                  </Link>
                </div>
            }
          </>
      }
      <div id="widget_root" />
    </div>
  )
}

export default TransactionsHistory;
