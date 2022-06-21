import { useRouter } from "next/router"
import { Fragment, useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { Swap } from "../lib/layerSwapApiClient"
import TokenService from "../lib/TokenService"
import SpinIcon from "./icons/spinIcon"
import { ClockIcon } from '@heroicons/react/solid';
import { ChevronRightIcon, ExternalLinkIcon, RefreshIcon } from '@heroicons/react/outline';

import { SwapStatus } from "../Models/SwapStatus"
import { Dialog, Transition } from "@headlessui/react"
import SwapDetails from "./swapDetailsComponent"
import LayerswapMenu from "./LayerswapMenu"


function statusIcon(status: SwapStatus) {
  if (status === 'failed') {
    return (<>
      <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="30" fill="#E43636" />
        <path d="M20 41L40 20" stroke="white" strokeWidth="3.15789" stroke-linecap="round" />
        <path d="M20 20L40 41" stroke="white" strokeWidth="3.15789" stroke-linecap="round" />
      </svg>
      <div className="text-white absolute inset-y-0 right-0 flex items-center px-4">
        <div className="relative flex flex-col items-center group">
          <div className="w-48 absolute right-0 bottom-0 flex flex-col items-right hidden mb-3 group-hover:flex">
            <span className="leading-4 min z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
              Swap failed
            </span>
            <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
          </div>
        </div>
      </div>
    </>

    )
  } else if (status === 'completed') {
    return (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="30" fill="#55B585" />
          <path d="M16.5781 29.245L25.7516 38.6843L42.6308 21.3159" stroke="white" strokeWidth="3.15789" stroke-linecap="round" />
        </svg>
        <div className="text-white absolute inset-y-0 right-0 flex items-center px-4">
          <div className="relative flex flex-col items-center group">
            <div className="w-48 absolute right-0 bottom-0 flex flex-col items-right hidden mb-3 group-hover:flex">
              <span className="leading-4 min z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
                Successfully completed
              </span>
              <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
            </div>
          </div>
        </div>
      </>

    )
  }
  else {
    return <>
      <ClockIcon className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9 fill-yellow-400" />
      <div className="text-white absolute inset-y-0 right-0 flex items-center px-4">
        <div className="relative flex flex-col items-center group">
          <div className="w-48 absolute right-0 bottom-0 flex flex-col items-right hidden mb-3 group-hover:flex">
            <span className="leading-4 min z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
              Pending
            </span>
            <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
          </div>
        </div>
      </div>
    </>
  }
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}
function TransactionsHistory() {
  const [page, setPage] = useState(0)
  const [isLastPage, setIsLastPage] = useState(false)
  const [swaps, setSwaps] = useState<Swap[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const router = useRouter();
  const [selectedSwap, setSelectedSwap] = useState<Swap | undefined>()

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

  const handleopenSwapDetails = (swap: Swap) => {
    setSelectedSwap(swap)
  }

  if (page === 0 && loading)
    return <Sceleton />

  return (
    <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative min-h`}>
      <div className="relative grid grid-cols-1 gap-4 place-content-end z-20 px-6 md:px-12" >
        <LayerswapMenu />
      </div>

      {
        false?
        <>
        <div className="px-6 md:px-12 lg:px-8 mb-2 ">
        <div className="-mx-4 mt-10 ring-1 ring-darkblue-100 sm:-mx-6 md:mx-0 md:rounded-lg bg-darkblue-600">
          <table className="min-w-full divide-y divide-darkblue-100">
            <thead>
              <tr>
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
                  TX Id
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
              {[]?.map((swap, index) => (
                <tr key={swap.id}>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-transparent',
                      'relative py-4 pl-4 sm:pl-6 pr-3 text-sm'
                    )}
                  >
                    <div className="text-white hidden lg:block">
                      {swap.exchange}
                    </div>
                    <div className="mt-1 flex flex-col text-white sm:block lg:hidden">
                      <span className="flex items-center">
                        {statusIcon(swap.status)}
                        {/* {plan.from} - {plan.to} */}
                      </span>
                      <span className="block lg:hidden">{(new Date(swap.created_date)).toLocaleString()}</span>
                    </div>
                    {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-100" /> : null}
                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-darkblue-100',
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                    )}
                  >
                    {swap.network}
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
                    {swap.id}
                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-darkblue-100',
                      'relative px-3 py-3.5 text-sm text-white hidden lg:table-cell group'
                    )}
                  >
                    {statusIcon(swap.status)}

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
                      className="group text-white  relative w-full flex justify-center py-2 px-2 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
                    >
                      <ChevronRightIcon className="h-5 w-5s" />
                    </button>
                    {index !== 0 ? <div className="absolute right-6 left-0 -top-px h-px bg-darkblue-100" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-white text-sm mt-auto mb-4 mt-10 flex justify-center mb-4">
        {
          !isLastPage &&
          <button
            disabled={isLastPage || loading}
            type="button"
            onClick={handleLoadMore}
            className="group disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed bg-pink-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
          >
            <span className="flex items-center pl-3 mr-2">
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
        <Dialog as="div" className="relative z-10" onClose={handleClose}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-darkBlue shadow-card text-center align-middle shadow-xl transition-all">

                  <SwapDetails id={selectedSwap?.id} />

                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={handleClose}
                    >
                      OK
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
        </>
        :<div className="m-16 text-center mb-20 pb-10">
          You do not have any transactions yet waln't you <a className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600" href="/">go</a> and do some swaps?
        </div>
      }

    </div>
  )
}

const Sceleton = () => {
  return <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative`}>
    <div className="px-4 sm:px-6 lg:px-8 mb-2">

      <div className="animate-pulse">
        <div className="-mx-4 mt-10 ring-1 ring-darkblue-100 sm:-mx-6 md:mx-0 md:rounded-lg bg-darkblue-600">
          <table className="min-w-full divide-y divide-darkblue-100">
            <thead>
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-500 sm:pl-6">
                  <div className="hidden lg:block">
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                  </div>
                  <div className="block lg:hidden">
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                  </div>
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-500 "
                >
                  <div className="h-2 bg-slate-700 rounded col-span-1"></div>
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
                  <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                </th>

                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)]?.map((item, index) => (
                <tr key={index}>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-transparent',
                      'relative py-4 pl-4 sm:pl-6 pr-3 text-sm'
                    )}
                  >
                    <div className="text-white hidden lg:block">
                      <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                    </div>
                    <div className="mt-1 flex flex-col text-white sm:block lg:hidden">
                      <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                    </div>
                    {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-100" /> : null}
                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-darkblue-100',
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                    )}
                  >
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-darkblue-100',
                      'px-3 py-3.5 text-sm text-white table-cell'
                    )}
                  >
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
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
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-darkblue-100',
                      'relative px-3 py-3.5 text-sm text-white hidden lg:table-cell group'
                    )}
                  >
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>

                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-darkblue-100',
                      'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                    )}
                  >
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                  </td>
                  <td
                    className={classNames(
                      index === 0 ? '' : 'border-t border-transparent',
                      'relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium'
                    )}
                  >
                    <div className="h-2 bg-slate-700 rounded col-span-1"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
}

export default TransactionsHistory;