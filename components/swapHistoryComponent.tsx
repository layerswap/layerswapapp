import { useRouter } from "next/router"
import { Fragment, useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { SwapDetailsResponse } from "../lib/layerSwapApiClient"
import TokenService from "../lib/TokenService"
import SpinIcon from "./icons/spinIcon"
import { ClockIcon } from '@heroicons/react/solid';
import { ChevronRightIcon, DuplicateIcon, ExternalLinkIcon, RefreshIcon, XIcon } from '@heroicons/react/outline';

import { SwapStatus } from "../Models/SwapStatus"
import { Dialog, Transition, Popover } from "@headlessui/react"
import SwapDetails from "./swapDetailsComponent"
import LayerswapMenu from "./LayerswapMenu"
import Link from "next/link"
import LayerSwapLogo from "./icons/layerSwapLogo"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import { copyTextToClipboard } from "../lib/copyToClipboard"
import { useAuthState } from "../context/auth"
import ClickTooltip from "./Tooltips/ClickTooltip"


export function StatusIcon({ swap }: { swap: SwapDetailsResponse }) {
  if (swap?.status === 'failed') {
    return (
      <>
        <div className="inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="30" fill="#E43636" />
          </svg>
          <p className="">Failed</p>
        </div>
      </>)
  } else if (swap?.status === 'completed') {
    return (
      <>
        <div className="inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="30" fill="#55B585" />
          </svg>
          <p className="">Completed</p>
        </div>
      </>
    )
  }
  else if (swap?.payment?.status == "closed")
    return (
      <>
        <div className="inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="30" fill="#E43636" />
          </svg>
          <p className="">Closed</p>
        </div>
      </>)
  else {
    return <>
      <div className="inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-2 h-2 lg:h-2 lg:w-2" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="30" fill="#facc15" />
        </svg>
        <p className="">Pending</p>
      </div>
    </>
  }
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}
function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const { exchanges, networks } = useSettingsState()
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<SwapDetailsResponse[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<SwapDetailsResponse | undefined>()
  const { email } = useAuthState()

  useEffect(() => {
    (async () => {
      setIsLastPage(false)
      setLoading(true)
      try {
        const authData = TokenService.getAuthData();
        if (!authData) {
          router.push({
            pathname: '/login',
            query: { redirect: '/transactions' }
          })
          return;
        }
        const layerswapApiClient = new LayerSwapApiClient()
        const swaps = await layerswapApiClient.getSwaps(1, authData.access_token)
        setSwaps(swaps)
        setPage(1)
        if (swaps?.length < 5)
          setIsLastPage(true)
      }
      catch (e) {
        setError(e.message)
      }
      finally {
        setLoading(false)
      }
    })()
  }, [])


  const handleLoadMore = useCallback(async () => {
    //TODO refactor page change
    const nextPage = page + 1
    try {
      setLoading(true)
      const authData = TokenService.getAuthData();
      if (!authData) {
        router.push('/login')
        return;
      }
      const layerswapApiClient = new LayerSwapApiClient()
      const swaps = await layerswapApiClient.getSwaps(nextPage, authData.access_token)

      setSwaps(old => [...(old ? old : []), ...(swaps ? swaps : [])])
      setPage(nextPage)
      if (swaps?.length < 5)
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

  const handleopenSwapDetails = (swap: SwapDetailsResponse) => {
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
            <Link href="/" key="Home" shallow={true}>
              <a>
                <LayerSwapLogo className="h-8 w-auto text-white  opacity-50" />
              </a>
            </Link>
          </div>
        </div>
        <LayerswapMenu />
      </div>
      {
        page == 0 && loading ?
          <Sceleton />
          : <>
            {
              swaps?.length > 0 ?
                <>
                  <div className=" mb-2 ">

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
                          {swaps?.map((swap, index) => {
                            const exchange = exchanges?.find(e => e.internal_name === swap?.exchange)
                            const network = networks?.find(n => n.code === swap?.network)
                            return <tr key={swap.id}>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'hidden pr-3 py-3.5 text-sm text-white lg:table-cell'
                                )}
                              >
                                <div className='inline-flex items-center'>
                                  <span className="mr-2">{swap?.id?.substring(0, 5)}...{swap?.id?.substring(swap?.id?.length - 4, swap?.id?.length - 1)}</span>
                                  <ClickTooltip text='Copied!'>
                                    <div className='border-0 ring-transparent' onClick={() => copyTextToClipboard(swap?.id)}>
                                      <DuplicateIcon className="h-4 w-4 text-gray-600" />
                                    </div>
                                  </ClickTooltip>
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
                                      <Image
                                        src={exchange?.logo_url}
                                        alt="Exchange Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    </div>
                                    <div className="mx-1">{exchange?.name}</div>
                                    <div className="flex-shrink-0 h-5 w-5 relative block lg:hidden">
                                      <Image
                                        src={network?.logo_url}
                                        alt="Exchange Logo"
                                        height="60"
                                        width="60"
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                      />
                                    </div>
                                    <div className="mx-1 block lg:hidden">{network?.name}</div>
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
                                    <Image
                                      src={network?.logo_url}
                                      alt="Exchange Logo"
                                      height="60"
                                      width="60"
                                      layout="responsive"
                                      className="rounded-md object-contain"
                                    />
                                  </div>
                                  <div className="ml-1">{network?.name}</div>
                                </div>

                              </td>
                              <td
                                className={classNames(
                                  index === 0 ? '' : 'border-t border-darkblue-100',
                                  'px-3 py-3.5 text-sm text-white table-cell'
                                )}
                              >
                                {swap.amount} {swap.currency}
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
                                {swap?.transaction_id ?
                                  <>
                                    <div className="underline hover:no-underline">
                                      <a target={"_blank"} href={networks.filter(x => x.code === swap?.network)[0]?.transaction_explorer_template.replace("{0}", swap?.transaction_id)}>{swap?.transaction_id?.substring(0, 5)}...{swap?.transaction_id?.substring(swap?.transaction_id?.length - 4, swap?.transaction_id?.length - 1)}</a>
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

                  <Transition appear show={!!selectedSwap} as={Fragment}>
                    <Dialog as="div" className="relative z-50" onClose={handleClose}>
                      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                      </Transition.Child>

                      <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                          <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                          >
                            <Dialog.Panel className="w-full space-y-6 max-w-md p-7 transform overflow-hidden rounded-md bg-darkBlue shadow-card text-center align-middle shadow-xl transition-all">
                              <div className="flex justify-between">
                                <div className='text-xl font-bold text-white'>Swap details</div>
                                <div className='relative grid grid-cols-1 gap-4 place-content-end z-40'>
                                  <span className="justify-self-end text-pink-primary-300 cursor-pointer">
                                    <div className="">
                                      <button
                                        type="button"
                                        className="rounded-md text-darkblue-200  hover:text-pink-primary-300"
                                        onClick={handleClose}
                                      >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                      </button>
                                    </div>
                                  </span>
                                </div>
                              </div>


                              <SwapDetails id={selectedSwap?.id} />
                              {
                                networks && selectedSwap?.transaction_id &&
                                <div className="text-white text-sm">
                                  <a href={networks.filter(x => x.code === selectedSwap?.network)[0]?.transaction_explorer_template.replace("{0}", selectedSwap?.transaction_id)}
                                    target="_blank"
                                    className="shadowed-button group text-white disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed bg-pink-primary relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out">
                                    View in Explorer
                                    <ExternalLinkIcon className='ml-2 h-5 w-5' />
                                  </a>
                                </div>
                              }
                            </Dialog.Panel>
                          </Transition.Child>
                        </div>
                      </div>
                    </Dialog>
                  </Transition>
                </>
                : <div className="m-16 text-center mb-20 pb-10">
                  There are no transactions for this account
                </div>
            }
          </>
      }
    </div>
  )
}

const Sceleton = () => {

  return <div className="animate-pulse">
    <div className=" mb-10 ">
      <div className="-mx-4 mt-10 sm:-mx-6 md:mx-0 md:rounded-lg ">
        <table className="min-w-full divide-y divide-darkblue-100">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-500 sm:pl-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="hidden lg:block">
                    <div className="h-2 w-8 bg-slate-700 rounded col-span-1"></div>
                  </div>
                </div>
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-2 w-8 bg-slate-700 rounded col-span-1"></div>
                </div>
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-500 "
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-2 w-8 bg-slate-700 rounded col-span-1"></div>
                </div>
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-2 w-16 bg-slate-700 rounded col-span-1"></div>
                </div>
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-2 w-16 bg-slate-700 rounded col-span-1"></div>
                </div>
              </th>

              <th
                scope="col"
                className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
              >
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-2 w-8 bg-slate-700 rounded col-span-1"></div>
                </div>
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-2 w-8 bg-slate-700 rounded col-span-1"></div>
                </div>
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">

              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)]?.map((item, index) => (
              <tr key={index}>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'relative py-4 pl-4 sm:pl-6 pr-3 text-sm'
                  )}
                >
                  <div className="text-white hidden lg:block">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="h-2 w-16 bg-slate-700 rounded col-span-1"></div>
                    </div>
                  </div>
                  {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-100" /> : null}
                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                  )}
                >
                  <div className="flex space-x-2">
                    <div className="rounded-full bg-slate-700 h-4 w-4"></div>
                    <div className="grid grid-cols-4 items-center">
                      <div className="h-2 w-16 bg-slate-700 rounded col-span-3"></div>
                    </div>
                  </div>

                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'px-3 py-3.5 text-sm text-white table-cell'
                  )}
                >
                  <div className="flex space-x-2">
                    <div className="rounded-full bg-slate-700 h-4 w-4"></div>
                    <div className="grid grid-cols-4 items-center">
                      <div className="h-2 w-16 bg-slate-700 rounded col-span-3"></div>
                    </div>
                  </div>
                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                  )}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <div className="h-2 w-16 bg-slate-700 rounded col-span-1"></div>
                  </div>
                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'relative px-3 py-3.5 text-sm text-white'
                  )}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <div className="h-2 w-16 bg-slate-700 rounded col-span-1"></div>
                  </div>
                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                  )}
                >
                  <div className="flex space-x-2">
                    <div className="rounded bg-slate-700 h-2 w-2"></div>
                    <div className="grid grid-cols-1 items-center">
                      <div className="h-2 w-16 bg-slate-700 rounded col-span-1"></div>
                    </div>
                  </div>
                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                  )}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-2 w-12 bg-slate-700 rounded col-span-1"></div>
                    <div className="h-2 w-8 bg-slate-700 rounded col-span-1"></div>
                  </div>
                </td>
                <td
                  className={classNames(
                    index === 0 ? '' : 'border-t border-darkblue-100',
                    'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                  )}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <ChevronRightIcon className="h-5 w-5 text-slate-700" />
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>

}

export default TransactionsHistory;