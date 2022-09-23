import { useRouter } from "next/router"
import { Fragment, useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { SwapListResponse, SwapItem, SwapType } from "../lib/layerSwapApiClient"
import TokenService from "../lib/TokenService"
import SpinIcon from "./icons/spinIcon"
import { ChevronRightIcon, ExternalLinkIcon, RefreshIcon, XIcon } from '@heroicons/react/outline';
import { Dialog, Transition } from "@headlessui/react"
import SwapDetails from "./swapDetailsComponent"
import LayerswapMenu from "./LayerswapMenu"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import { useAuthState } from "../context/authContext"
import shortenAddress from "./utils/ShortenAddress"
import { classNames } from "./utils/classNames"
import SubmitButton from "./buttons/submitButton"
import CopyButton from "./buttons/copyButton"
import { SwapHistoryComponentSceleton } from "./Sceletons"
import GoHomeButton from "./utils/GoHome"
import StatusIcon, { GreenIcon, RedIcon, YellowIcon } from "./StatusIcons"

function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const { data } = useSettingsState()
  const { exchanges, networks, discovery: { resource_storage_url } } = data
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<SwapListResponse>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
  const { email } = useAuthState()

  useEffect(() => {
    (async () => {
      setIsLastPage(false)
      setLoading(true)
      try {
        const authData = TokenService.getAuthData();
        if (!authData) {
          router.push({
            pathname: '/auth',
            query: { ...(router.query), redirect: '/transactions' }
          })
          return;
        }
        const layerswapApiClient = new LayerSwapApiClient()
        const swaps = await layerswapApiClient.getSwaps(1, authData.access_token)
        setSwaps(swaps)
        setPage(1)
        if (swaps?.data.length < 5)
          setIsLastPage(true)
      }
      catch (e) {
        setError(e.message)
      }
      finally {
        setLoading(false)
      }
    })()
  }, [router.query])


  const handleLoadMore = useCallback(async () => {
    //TODO refactor page change
    const nextPage = page + 1
    try {
      setLoading(true)
      const authData = TokenService.getAuthData();
      if (!authData) {
        router.push('/auth')
        return;
      }
      const layerswapApiClient = new LayerSwapApiClient()
      const response = await layerswapApiClient.getSwaps(nextPage, authData.access_token)

      setSwaps(old => ({ ...response, data: [...(old?.data ? old?.data : []), ...(response.data ? response.data : [])] }))
      setPage(nextPage)
      if (response?.data.length < 5)
        setIsLastPage(true)
    }
    catch (e) {
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }, [page, setSwaps])

  const handleClose = () => {
    setSelectedSwap(undefined)
  }

  const handleopenSwapDetails = (swap: SwapItem) => {
    setSelectedSwap(swap)
  }

  return (
    <div className={`bg-darkBlue px-8 md:px-12 shadow-card rounded-lg w-full overflow-hidden relative min-h`}>
      <div className="mt-3 flex items-center justify-between z-20" >
        <div className="hidden md:block">
          <p className="text-2xl mb-1 mt-2 font-bold">Account</p>
          <span className="text-gray-500 font-medium">{email}</span>
        </div>
        <div className='mx-auto px-4 overflow-hidden md:hidden'>
          <div className="flex justify-center">
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
              swaps?.data.length > 0 ?
                <>
                  <div className="mb-2">
                    <div className="-mx-4 mt-10 sm:-mx-6 md:mx-0 md:rounded-lg">
                      <table className="min-w-full divide-y divide-darkblue-100">
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              className="hidden pr-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                            >
                              Id
                            </th>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-500 sm:pl-6">
                              <div className="hidden lg:block">
                                From
                              </div>
                              <div className="block lg:hidden">
                                From - To / Date
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                            >
                              To
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-500 "
                            >
                              Amount
                            </th>
                            {/* <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
              >
                Fee
              </th> */}
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                            >
                              Transaction
                            </th>
                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                            >
                              Status
                            </th>

                            <th
                              scope="col"
                              className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                            >
                              Date
                            </th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                              <span className="sr-only">More</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {swaps?.data.map((swap, index) => {
                            const swapExchange = exchanges?.find(e => e.currencies.some(ec => ec.id === swap?.exchange_currency_id))
                            const swapNetwork = networks?.find(n => n.currencies.some(nc => nc.id === swap?.network_currency_id))
                            const currency = swapExchange.currencies.find(x => x.id == swap?.exchange_currency_id)

                            const { transaction_explorer_template } = swapNetwork

                            const source = swap.type == SwapType.OnRamp ? swapExchange : swapNetwork;
                            const destination = swap.type == SwapType.OnRamp ? swapNetwork : swapExchange;

                            return <tr key={swap.id}>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'hidden pr-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                <div className='inline-flex items-center'>
                                  <CopyButton iconClassName="text-gray-500" toCopy={swap.id}>
                                    {shortenAddress(swap.id)}
                                  </CopyButton>
                                </div>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'relative py-4 pl-4 sm:pl-6 pr-3 text-sm'
                                )}
                              >
                                <div className="text-white ">
                                  <div className="flex items-center">
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
                                    <div className="mx-1">{source?.display_name}</div>
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
                                    <div className="mx-1 block lg:hidden">{destination?.display_name}</div>
                                  </div>
                                </div>
                                <div className="flex items-center mt-1 text-white sm:block lg:hidden">
                                  <span className="block lg:hidden">{(new Date(swap.created_date)).toLocaleString()}</span>
                                </div>
                                {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-100" /> : null}
                                <span className="flex items-center sm:block lg:hidden">
                                  {<StatusIcon swap={swap} />}
                                  {/* {plan.from} - {plan.to} */}
                                </span>
                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
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
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'px-3 py-3.5 text-sm text-white table-cell'
                                )}
                              >
                                {swap.received_amount} {currency.asset}
                              </td>
                              {/* <td
                className={classNames(
                  index === 0 ? '' : 'border-t border-darkblue-100',
                  'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                )}
              >
                {swap.fee} {swap.currency} 
              </td> */}
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                {swap.transaction_id ?
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
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'relative px-3 py-3.5 text-sm text-white hidden lg:table-cell group'
                                )}
                              >
                                {<StatusIcon swap={swap} />}

                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
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
                                {index !== 0 ? <div className="absolute right-6 left-0 -top-px h-px bg-darkblue-100" /> : null}
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
                        className="group disabled:text-pink-primary-600 text-pink-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
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