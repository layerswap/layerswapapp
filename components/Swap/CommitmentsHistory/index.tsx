import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import { ArrowRight, ChevronRight, Eye, RefreshCcw, Scroll } from 'lucide-react';
import { Commit } from "../../../Models/PHTLC";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import HeaderWithMenu from "../../HeaderWithMenu";
import { SwapHistoryComponentSceleton } from "../../Sceletons";
import { classNames } from "../../utils/classNames";
import { useSettingsState } from "../../../context/settings";

function CommittmentsHistory() {
    const [page, setPage] = useState(0)
    const [isLastPage, setIsLastPage] = useState(false)
    const [swaps, setSwaps] = useState<Commit[]>()
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const [selectedSwap, setSelectedSwap] = useState<Commit | undefined>()
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [showAllSwaps, setShowAllSwaps] = useState(false)

    const { networks } = useSettingsState()


    const PAGE_SIZE = 20

    const goBack = useCallback(() => {
        window?.['navigation']?.['canGoBack'] ?
            router.back()
            : router.push({
                pathname: "/",
                query: resolvePersistantQueryParams(router.query)
            })
    }, [router])

    useEffect(() => {
        (async () => {
            setIsLastPage(false)
            setLoading(true)


            setLoading(false)
        })()
    }, [router.query, showAllSwaps])

    const handleLoadMore = useCallback(async () => {
        //TODO refactor page change
        const nextPage = page + 1
        setLoading(true)

        setSwaps(old => [...(old ? old : []), ...(data ? data : [])])
        setPage(nextPage)
        if (Number(data?.length) < PAGE_SIZE)
            setIsLastPage(true)

        setLoading(false)

    }, [page, setSwaps])

    const handleopenSwapDetails = (commit: Commit) => {
        setSelectedSwap(commit)
        setOpenSwapDetailsModal(true)
    }

    const handleToggleChange = (value: boolean) => {
        setShowAllSwaps(value);
    }

    return (
        <div className='bg-secondary-900 sm:shadow-card rounded-lg mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px]'>
            <HeaderWithMenu goBack={goBack} />
            {
                page == 0 && loading ?
                    <SwapHistoryComponentSceleton />
                    : <>
                        {
                            Number(swaps?.length) > 0 ?
                                <div className="w-full flex flex-col justify-between h-full px-6 space-y-5 text-secondary-text">
                                    <div className="mt-4">
                                        <div className=" sm:max-h-[450px] styled-scroll overflow-y-auto ">
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
                                                    {swaps?.map((commit, index) => {
                                                        const {
                                                            amount,
                                                            dstAddress,
                                                            dstAsset,
                                                            dstChain,
                                                            locked,
                                                            sender,
                                                            srcAsset,
                                                            srcReceiver,
                                                            timelock,
                                                            uncommitted
                                                        } = commit

                                                        const source_network = networks.find(n => n.name === srcReceiver)

                                                        return <tr onClick={() => handleopenSwapDetails(commit)} key={index}>

                                                            <td
                                                                className={classNames(
                                                                    index === 0 ? '' : 'border-t border-secondary-500',
                                                                    'relative text-sm text-primary-text table-cell'
                                                                )}
                                                            >
                                                                <div className="text-primary-text flex items-center">
                                                                    {/* <div className="flex-shrink-0 h-5 w-5 relative">
                                                                        {source_network &&
                                                                            <Image
                                                                                src={source_exchange?.logo || source_network.logo}
                                                                                alt="Source Logo"
                                                                                height="60"
                                                                                width="60"
                                                                                className="rounded-md object-contain"
                                                                            />
                                                                        }
                                                                    </div>
                                                                    <ArrowRight className="h-4 w-4 mx-2" />
                                                                    <div className="flex-shrink-0 h-5 w-5 relative block">
                                                                        {destination_network &&
                                                                            <Image
                                                                                src={destination_exchange?.logo || destination_network.logo}
                                                                                alt="Destination Logo"
                                                                                height="60"
                                                                                width="60"
                                                                                className="rounded-md object-contain"
                                                                            />
                                                                        }
                                                                    </div> */}
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
                                                                    <div>
                                                                        <div className="text text-secondary-text text-left">
                                                                            <span>
                                                                                {truncateDecimals(swap.requested_amount, source_token?.precision)}
                                                                            </span>
                                                                            <span className="ml-1">{source_token?.symbol}</span>
                                                                        </div>
                                                                        {
                                                                            output_transaction ?
                                                                                <div className="text-secprimary-text text-left text-base">
                                                                                    <span>
                                                                                        {truncateDecimals(output_transaction?.amount, source_token?.precision)}
                                                                                    </span>
                                                                                    <span className="ml-1">{destination_token?.symbol}</span>
                                                                                </div>
                                                                                : <div className="text-left text-base">-</div>
                                                                        }
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
                                    <Modal height="fit" show={openSwapDetailsModal} setShow={setOpenSwapDetailsModal} header="Swap details" modalId="swapHistory">
                                        <div className="mt-2">
                                            {
                                                selectedSwap && <SwapDetails id={selectedSwap?.id} />
                                            }
                                            {
                                                selectedSwap &&
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
                                                                <Eye
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

export default CommittmentsHistory;
