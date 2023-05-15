import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { SwapItem, SwapStatusInNumbers } from "../../lib/layerSwapApiClient"
import SpinIcon from "../icons/spinIcon"
import { ArrowRight, ChevronRight, ExternalLink, RefreshCcw, X } from 'lucide-react';
import SwapDetails from "./SwapDetailsComponent"
import { useSettingsState } from "../../context/settings"
import Image from 'next/image'
import { useAuthState } from "../../context/authContext"
import { classNames } from "../utils/classNames"
import SubmitButton, { DoubleLineText } from "../buttons/submitButton"
import { SwapHistoryComponentSceleton } from "../Sceletons"
import StatusIcon, { } from "./StatusIcons"
import toast from "react-hot-toast"
import { useSwapDataUpdate } from "../../context/swap"
import { SwapStatus } from "../../Models/SwapStatus"
import ToggleButton from "../buttons/toggleButton";
import Modal from "../modal/modal";
import HeaderWithMenu from "../HeaderWithMenu";
import { SwapCancelModal } from "../Wizard/Steps/PendingSwapsStep";

function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const settings = useSettingsState()
  const { exchanges, networks, resolveImgSrc } = settings
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<SwapItem[]>()
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
  const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
  const canCompleteCancelSwap = selectedSwap?.status == SwapStatus.UserTransferPending
  const [showCancelledSwaps, setShowCancelledSwaps] = useState(false)
  const [showToggleButton, setShowToggleButton] = useState(false)
  const [openCancelConfirmModal, setOpenCancelConfirmModal] = useState(false)

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

      if (showCancelledSwaps) {
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

        const { data, error } = await layerswapApiClient.GetSwapsAsync(1, SwapStatusInNumbers.SwapsWithoutCancelled)

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
  }, [router.query, showCancelledSwaps])

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
    if (data.length < PAGE_SIZE)
      setIsLastPage(true)

    setLoading(false)
  }, [page, setSwaps])

  const handleopenSwapDetails = (swap: SwapItem) => {
    setSelectedSwap(swap)
    setOpenSwapDetailsModal(true)
  }

  const handleToggleChange = (value: boolean) => {
    setShowCancelledSwaps(value)
  }

  return (
    <div className='bg-darkblue-900 sm:shadow-card rounded-lg mb-6 w-full text-white overflow-hidden relative min-h-[550px]'>
      <HeaderWithMenu goBack={handleGoBack} />
      {
        page == 0 && loading ?
          <SwapHistoryComponentSceleton />
          : <>
            {
              swaps?.length > 0 ?
                <div className="w-full flex flex-col justify-between h-full px-6 space-y-5 text-primary-text">
                  <div className="mt-4">
                    {showToggleButton && <div className="flex justify-end mb-2">
                      <div className='flex space-x-2'>
                        <p className='flex items-center text-xs md:text-sm font-medium'>
                          Show cancelled swaps
                        </p>
                        <ToggleButton onChange={handleToggleChange} value={showCancelledSwaps} />
                      </div>
                    </div>}
                    <div className="max-h-[450px] styled-scroll overflow-y-auto ">
                      <table className="w-full divide-y divide-darkblue-500">
                        <thead className="text-primary-text">
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
                              source_network_asset: source_network_asset
                            } = swap

                            const source = source_exchange_internal_name ? exchanges.find(e => e.internal_name === source_exchange_internal_name) : networks.find(e => e.internal_name === source_network_internal_name)
                            const destination_exchange = destination_exchange_internal_name && exchanges.find(e => e.internal_name === destination_exchange_internal_name)
                            const exchange_currency = destination_exchange_internal_name && destination_exchange.currencies?.find(c => swap?.source_network_asset?.toUpperCase() === c?.asset?.toUpperCase() && c?.is_default)

                            const destination_network = destination_network_internal_name ? networks.find(n => n.internal_name === destination_network_internal_name) : networks?.find(e => e?.internal_name?.toUpperCase() === exchange_currency?.network?.toUpperCase())

                            const destination = destination_exchange_internal_name ? destination_exchange : networks.find(n => n.internal_name === destination_network_internal_name)

                            return <tr onClick={() => handleopenSwapDetails(swap)} key={swap.id}>

                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'relative text-sm text-white table-cell'
                                )}
                              >
                                <div className="text-white flex items-center">
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
                                {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-500" /> : null}

                              </td>
                              <td className={classNames(
                                index === 0 ? '' : 'border-t border-darkblue-500',
                                'relative text-sm table-cell'
                              )}>
                                <span className="flex items-center">
                                  {swap && <StatusIcon status={swap.status} />}
                                  {/* {plan.from} - {plan.to} */}
                                </span>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'px-3 py-3.5 text-sm text-white table-cell'
                                )}
                              >
                                <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { handleopenSwapDetails(swap); e.preventDefault() }}>
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
                                  <ChevronRight className="h-5 w-5" />
                                </div>
                              </td>
                            </tr>
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-white text-sm flex justify-center">
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
                        Load more
                      </button>
                    }
                  </div>
                  <Modal height="fit" show={openSwapDetailsModal} setShow={setOpenSwapDetailsModal} header="Swap details">
                    <div className="mt-2">
                      <SwapDetails id={selectedSwap?.id} />
                      {
                        canCompleteCancelSwap &&
                        <div className="text-white text-sm mt-6 space-y-3">
                          <div className="flex flex-row text-white text-base space-x-2">
                            <div className='basis-1/3'>
                              <SubmitButton text_align="left" buttonStyle="outline" onClick={async () => setOpenCancelConfirmModal(true)} isDisabled={false} isSubmitting={false} icon={<X className='h-5 w-5' />}>
                                <DoubleLineText
                                  colorStyle='mltln-text-dark'
                                  primaryText='Cancel'
                                  secondarytext='the swap'
                                  reversed={true}
                                />
                              </SubmitButton>
                            </div>
                            <div className='basis-2/3'>
                              <SubmitButton button_align='right' text_align="left" onClick={() => router.push(`/swap/${selectedSwap.id}`)} isDisabled={false} isSubmitting={false} icon={<ExternalLink className='h-5 w-5' />}>
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
                  <SwapCancelModal onCancel={() => router.reload()} swapToCancel={selectedSwap} openCancelConfirmModal={openCancelConfirmModal} setOpenCancelConfirmModal={setOpenCancelConfirmModal} />
                </div>
                : <div className="absolute top-1/2 right-0 text-center w-full">
                  There are no transactions for this account
                </div>
            }
          </>
      }
      <div id="widget_root" />
    </div>
  )
}

export default TransactionsHistory;
