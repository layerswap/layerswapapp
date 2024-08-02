import { useRouter } from "next/router"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronRight, RefreshCcw, Scroll } from 'lucide-react';
import { Commit } from "../../../Models/PHTLC";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import HeaderWithMenu from "../../HeaderWithMenu";
import { classNames } from "../../utils/classNames";
import { useSettingsState } from "../../../context/settings";
import useWallet from "../../../hooks/useWallet";
import { Popover, PopoverContent, PopoverTrigger } from "../../shadcn/popover";
import { Wallet } from "../../../stores/walletStore";
import shortenAddress from "../../utils/ShortenAddress";
import SpinIcon from "../../icons/spinIcon";
import { SwapHistoryComponentSceleton } from "../../Sceletons";
import Image from 'next/image'
import formatAmount from "../../../lib/formatAmount";
import Modal from "../../modal/modal";
import CommitDetails from "./CommitDetailsComponent";

function CommittmentsHistory() {
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [selectedCommit, setSelectedCommit] = useState<Commit & { id: string } | undefined>()
    const [page, setPage] = useState(0)
    const [isLastPage, setIsLastPage] = useState(false)
    const [loading, setLoading] = useState(false)
    const [commitIds, setCommitIds] = useState<string[]>([])
    const router = useRouter();
    const { wallets, getWithdrawalProvider } = useWallet()

    const [selectedWallet, setSelectedWallet] = useState<Wallet | undefined>(wallets?.[0])
    const [commitments, setCommitments] = useState<(Commit & { id: string })[]>([])

    const { networks } = useSettingsState()
    const activeNetwork = networks.find(network => network.chain_id == selectedWallet?.chainId)
    const provider = useMemo(() => {
        return activeNetwork && getWithdrawalProvider(activeNetwork)
    }, [activeNetwork, getWithdrawalProvider])
    const activeChain = provider?.connectedWalletActiveChain

    const PAGE_SIZE = 5

    const goBack = useCallback(() => {
        window?.['navigation']?.['canGoBack'] ?
            router.back()
            : router.push({
                pathname: "/",
                query: resolvePersistantQueryParams(router.query)
            })
    }, [router])

    const getCommitments = async (page: number, commitIds: string[]) => {
        let commits: (Commit & { id: string })[] = []

        for (let i = page * PAGE_SIZE; i < (page + 1) * PAGE_SIZE; i++) {
            const commit = commitIds[i] && await provider?.getCommitment({ commitId: commitIds[i], chainId: activeNetwork?.chain_id as string, contractAddress: activeNetwork?.metadata.htlc_contract as `0x${string}` })
            if (commit) {
                commits.push({
                    id: commitIds[i],
                    ...commit
                })
            }
        }

        return commits
    }

    const handleOpenCommitDetails = (commit: Commit & { id: string }) => {
        setSelectedCommit(commit)
        setOpenSwapDetailsModal(true)
    }

    useEffect(() => {
        (async () => {
            if (!activeNetwork?.metadata.htlc_contract || !activeNetwork.chain_id) return

            setIsLastPage(false)
            setLoading(true)

            const commIds = await provider?.getCommits({ contractAddress: activeNetwork?.metadata.htlc_contract as `0x${string}`, chainId: activeNetwork.chain_id })
            if (commIds) setCommitIds(commIds)

            const commits = commIds && await getCommitments(page, commIds)
            if (commits) setCommitments(commits)

            setPage(0)
            if (Number(commIds?.length) < PAGE_SIZE)
                setIsLastPage(true)
            setLoading(false)
        })()
    }, [router.query, selectedWallet, activeChain])

    const handleLoadMore = useCallback(async () => {
        const nextPage = page + 1
        setLoading(true)

        const commits = commitIds && await getCommitments(nextPage, commitIds)
        setCommitments(old => [...(old ? old : []), ...(commits ? commits : [])])

        setPage(nextPage)
        if (Number(commitIds?.length) < PAGE_SIZE)
            setIsLastPage(true)

        setLoading(false)
    }, [page, setCommitments, commitIds])

    useEffect(() => {
        if (!selectedWallet) {
            setSelectedWallet(wallets?.[0])
        }
    }, [wallets])

    return (

        <div className='bg-secondary-900 sm:shadow-card rounded-containerRoundness mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px]'>
            <HeaderWithMenu goBack={goBack} />
            <div className="px-6 mt-3">
                <WalletSelector wallets={wallets} selectedWallet={selectedWallet} setSelectedWallet={setSelectedWallet} />
                {
                    page == 0 && loading ?
                        <SwapHistoryComponentSceleton />
                        : <>
                            {
                                Number(commitments?.length) > 0 ?
                                    <div className="w-full flex flex-col justify-between h-full space-y-5 text-secondary-text">
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
                                                        {commitments?.map((commit, index) => {
                                                            const {
                                                                amount,
                                                                dstAddress,
                                                                dstAsset,
                                                                dstChain,
                                                                locked,
                                                                sender,
                                                                srcAsset,

                                                            } = commit

                                                            const source_network = networks.find(network => network.name === activeNetwork?.name)
                                                            const destination_network = networks.find(network => network.name === dstChain)
                                                            const source_token = source_network?.tokens.find(token => token.symbol === srcAsset)

                                                            return <tr onClick={() => handleOpenCommitDetails(commit)} key={index}>

                                                                <td
                                                                    className={classNames(
                                                                        index === 0 ? '' : 'border-t border-secondary-500',
                                                                        'relative text-sm text-primary-text table-cell'
                                                                    )}
                                                                >
                                                                    <div className="text-primary-text flex items-center">
                                                                        <div className="flex-shrink-0 h-5 w-5 relative">
                                                                            {source_network &&
                                                                                <Image
                                                                                    src={source_network.logo}
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
                                                                                    src={destination_network.logo}
                                                                                    alt="Destination Logo"
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
                                                                        {/* {swap && <StatusIcon swap={swap} />} */}
                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className={classNames(
                                                                        index === 0 ? '' : 'border-t border-secondary-500',
                                                                        'px-3 py-3.5 text-sm text-primary-text table-cell'
                                                                    )}
                                                                >
                                                                    <div className="flex justify-between items-center cursor-pointer">
                                                                        <div>
                                                                            <div className="text text-secondary-text text-left">
                                                                                <span>
                                                                                    {formatAmount(amount, source_token?.decimals!)}
                                                                                </span>
                                                                                <span className="ml-1">{source_token?.symbol}</span>
                                                                            </div>
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

                                    </div>
                                    :
                                    <div className="absolute top-1/4 right-0 text-center w-full">
                                        <Scroll className='h-40 w-40 text-secondary-700 mx-auto' />
                                        <p className="my-2 text-xl">It&apos;s empty here</p>
                                        <p className="px-14 text-primary-text">You can find all your transactions by searching with address in</p>
                                    </div>
                            }
                            <Modal height="fit" show={openSwapDetailsModal} setShow={setOpenSwapDetailsModal} header="Swap details" modalId="swapHistory">
                                <div className="mt-2">
                                    {
                                        selectedCommit && selectedWallet && <CommitDetails commit={selectedCommit} selectedWallet={selectedWallet} />
                                    }
                                </div>
                            </Modal>
                        </>
                }
            </div>
            <div id="widget_root" />
        </div>

    )
}

type WallectSelectorProps = {
    wallets: Wallet[]
    selectedWallet: Wallet | undefined
    setSelectedWallet: (wallet: Wallet) => void
}

const WalletSelector: FC<WallectSelectorProps> = ({ wallets, selectedWallet, setSelectedWallet }) => {
    const [showModal, setShowModal] = useState(false)

    return <Popover open={showModal} onOpenChange={setShowModal}>
        <PopoverTrigger className="font-semibold text-secondary-text text-xs flex items-center space-x-1">
            <span> Transfered via </span> <span>{selectedWallet?.connector}</span> <div>
                <ChevronDown className=" w-4 h-4 " />
            </div>
        </PopoverTrigger>
        <PopoverContent className=' ml-2 mt-1 text-sm p-2 max-w border-none rounded-xl bg-secondary-600 max-w-72 md:max-w-96' align="start">
            <div>
                {
                    wallets.map(wallet => <div key={wallet.address} className={classNames("flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-secondary-700", selectedWallet === wallet.connector && 'bg-secondary-700')} onClick={() => {
                        wallet.connector && setSelectedWallet(wallet)
                        setShowModal(false)
                    }}>
                        <wallet.icon className="w-6 h-6" />
                        <span>{shortenAddress(wallet.address)}</span>

                    </div>)
                }
            </div>
        </PopoverContent>
    </Popover>
}

export default CommittmentsHistory;
