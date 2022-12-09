import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { SwapItem, SwapType } from "../lib/layerSwapApiClient"
import SpinIcon from "./icons/spinIcon"
import { ArrowRightIcon, ChevronRightIcon, ExternalLinkIcon, RefreshIcon, XIcon } from '@heroicons/react/outline';
import SwapDetails from "./swapDetailsComponent"
import LayerswapMenu from "./LayerswapMenu"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import { useAuthState } from "../context/authContext"
import shortenAddress from "./utils/ShortenAddress"
import { classNames } from "./utils/classNames"
import SubmitButton, { DoubleLineText } from "./buttons/submitButton"
import CopyButton from "./buttons/copyButton"
import { SwapHistoryComponentSceleton } from "./Sceletons"
import GoHomeButton from "./utils/GoHome"
import StatusIcon from "./StatusIcons"
import Modal from "./modalComponent"
import HoverTooltip from "./Tooltips/HoverTooltip"
import toast from "react-hot-toast"
import { ArrowLeftIcon } from "@heroicons/react/solid"
import { useSwapDataUpdate } from "../context/swap"
import { SwapStatus } from "../Models/SwapStatus"
import { DepositFlow } from "../Models/Exchange";

function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const settings = useSettingsState()
  const { exchanges, networks, discovery: { resource_storage_url } } = settings
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<SwapItem[]>()
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
  const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
  const { email } = useAuthState()
  const { cancelSwap } = useSwapDataUpdate()
  const canCompleteCancelSwap = selectedSwap?.status == SwapStatus.UserTransferPending && !(selectedSwap?.type == SwapType.OnRamp && exchanges?.find(e => e.currencies.some(ec => ec.id === selectedSwap?.exchange_currency_id)).deposit_flow == DepositFlow.Automatic)

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
      if (data.length < 5)
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

  const handleClose = () => {
    setOpenSwapDetailsModal(false)
  }

  const handleopenSwapDetails = (swap: SwapItem) => {
    setSelectedSwap(swap)
    setOpenSwapDetailsModal(true)
  }

  const FormattedDate = ({ date }: { date: string }) => {
    const swapDate = new Date(date);
    const yyyy = swapDate.getFullYear();
    let mm = swapDate.getMonth() + 1; // Months start at 0!
    let dd = swapDate.getDate();

    if (dd < 10) dd = 0 + dd;
    if (mm < 10) mm = 0 + mm;

    return <>{dd + '/' + mm + '/' + yyyy}</>;
  }

  return (
    <div className={`bg-darkblue px-8 md:px-12 md:mb-12 shadow-card rounded-lg w-full overflow-hidden relative`}>
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
                <>
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
                              Status
                            </th>

                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold  lg:table-cell"
                            >
                              Date
                            </th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                              <span className="sr-only">More</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {swaps?.map((swap, index) => {
                            const swapExchange = exchanges?.find(e => e.currencies.some(ec => ec.id === swap?.exchange_currency_id))
                            const swapNetwork = networks?.find(n => n.currencies.some(nc => nc.id === swap?.network_currency_id))
                            const currency = swapExchange.currencies.find(x => x.id == swap?.exchange_currency_id)

                            const { transaction_explorer_template } = swapNetwork

                            const source = swap.type == SwapType.OnRamp ? swapExchange : swapNetwork;
                            const destination = swap.type == SwapType.OnRamp ? swapNetwork : swapExchange;

                            return <tr key={swap.id}>
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
                                      source?.logo &&
                                      <Image
                                        src={`${resource_storage_url}${source?.logo}`}
                                        alt="From Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                  <div className="mx-1 hidden lg:block">{source?.display_name}</div>
                                  <ArrowRightIcon className="h-4 w-4 lg:hidden mx-2" />
                                  <div className="flex-shrink-0 h-5 w-5 relative block lg:hidden">
                                    {
                                      destination?.logo &&
                                      <Image
                                        src={`${resource_storage_url}${destination?.logo}`}
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
                                      destination?.logo &&
                                      <Image
                                        src={`${resource_storage_url}${destination?.logo}`}
                                        alt="To Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    }
                                  </div>
                                  <div className="ml-1">{destination?.display_name}</div>
                                </div>

                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'px-3 py-3.5 text-sm text-white table-cell'
                                )}
                              >
                                <div className="md:flex">
                                  {
                                    swap?.status == 'completed' && swap.received_amount != swap.requested_amount ?
                                      <div className="flex flex-col md:flex-row text-left">
                                        <span className="ml-1 md:ml-0">{swap.received_amount} /</span>
                                        <HoverTooltip text='Amount You Requested' moreClassNames="w-40 text-center">
                                          <span className="underline decoration-dotted hover:no-underline">
                                            {swap.requested_amount}
                                          </span>
                                        </HoverTooltip>
                                      </div>
                                      :
                                      <span>
                                        {swap.requested_amount}
                                      </span>
                                  }
                                  <span className="ml-1">{currency.asset}</span>
                                </div>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-500',
                                  'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                {swap.transaction_id && swap.type == SwapType.OnRamp ?
                                  <>
                                    <div className="underline hover:no-underline">
                                      <a target={"_blank"} href={transaction_explorer_template.replace("{0}", swap.transaction_id)}>{shortenAddress(swap.transaction_id)}</a>
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
                                  'relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium'
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
                  <div className="text-white text-sm mt-auto mb-4 flex justify-center">
                    {
                      !isLastPage &&
                      <button
                        disabled={isLastPage || loading}
                        type="button"
                        onClick={handleLoadMore}
                        className="group disabled:text-primary-800 text-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
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
                        settings.networks && selectedSwap?.transaction_id && selectedSwap.type == SwapType.OnRamp && selectedSwap?.status == SwapStatus.Completed &&
                        <div className="text-white text-sm mt-6">
                          <a href={networks?.find(n => n.currencies.some(nc => nc.id === selectedSwap?.network_currency_id)).transaction_explorer_template.replace("{0}", selectedSwap?.transaction_id)}
                            target="_blank"
                            className="shadowed-button cursor-pointer group text-white disabled:text-white-alpha-100 disabled:bg-primary-800 disabled:cursor-not-allowed bg-primary relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                            View in Explorer
                            <ExternalLinkIcon className='ml-2 h-5 w-5' />
                          </a>
                        </div>
                      }
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
                              <SubmitButton button_align='right' text_align="left" onClick={() => router.push(`/${selectedSwap.id}`)} isDisabled={false} isSubmitting={false} icon={<ExternalLinkIcon className='h-5 w-5' />}>
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
                </>
                : <div className="sm:my-24 sm:mx-60 m-16 pb-20 text-center sm:pb-10">
                  There are no transactions for this account
                </div>
            }
          </>
      }
    </div>
  )
}

export default TransactionsHistory;
