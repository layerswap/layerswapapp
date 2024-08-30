import { useRouter } from "next/router"
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronRight, RefreshCcw, Scroll } from 'lucide-react';
import { AssetLock, Commit } from "../../../Models/PHTLC";
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
import Modal from "../../modal/modal";
import CommitDetails from "./CommitDetailsComponent";
import ConnectButton from "../../buttons/connectButton";
import WalletIcon from "../../icons/WalletIcon";
import StatusIcon from "./StatusIcons";
import AppSettings from "../../../lib/AppSettings";
import { truncateDecimals } from "../../utils/RoundDecimals";

type CommitStatus = 'committed' | 'user_locked' | 'lp_locked' | 'completed' | 'refunded' | 'timelock_expired'

const commitStatusResolver = (commit: Commit, destination_lock: AssetLock | undefined): CommitStatus => {

    if (destination_lock?.redeemed) return 'completed'
    //TODO check&implement source lock refund
    else if (commit.uncommitted) return 'refunded'
    else if (commit.timelock && Number(commit.timelock) * 1000 < Date.now()) return 'timelock_expired'
    else if (commit.locked) return 'user_locked'
    else if (destination_lock) return 'lp_locked'

    return 'committed'
}

export type HistoryCommit = Commit & { id: string, status: CommitStatus }

function CommittmentsHistory() {
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [selectedCommit, setSelectedCommit] = useState<HistoryCommit | undefined>()
    const [page, setPage] = useState(0)
    const [isLastPage, setIsLastPage] = useState(false)
    const [loading, setLoading] = useState(false)
    const [commitIds, setCommitIds] = useState<string[]>([])
    const [erc20CommIds, setErc20CommIds] = useState<string[]>([])
    const router = useRouter();
    const { wallets, getWithdrawalProvider, getProviderByName } = useWallet()

    const [selectedProvider, setSelectedProvider] = useState<string | undefined>(wallets?.[0]?.connector)
    const [commitments, setCommitments] = useState<(HistoryCommit)[]>([])

    const selectedWallet = wallets.find(wallet => wallet.connector === selectedProvider)

    const source_provider = useMemo(() => {
        return selectedWallet && getProviderByName(selectedWallet?.providerName)
    }, [selectedWallet, getWithdrawalProvider])

    const { networks } = useSettingsState()
    const activeNetwork = networks.find(network => network.chain_id == selectedWallet?.chainId)

    const PAGE_SIZE = 5

    const getCommitments = async (page: number, commitIds: string[], sourceAtomicContract: string, sourceType: 'native' | 'erc20') => {
        let commits: (HistoryCommit)[] = []

        for (let i = page * PAGE_SIZE; i < (page + 1) * PAGE_SIZE; i++) {
            const commit = commitIds[i] && await source_provider?.getCommitment({ commitId: commitIds[i], chainId: activeNetwork?.chain_id as string, contractAddress: sourceAtomicContract as `0x${string}`, type: sourceType })

            const destination_network = commit && networks.find(network => network.name === commit.dstChain) || null
            const destination_provider = destination_network && getWithdrawalProvider(destination_network)
            const destination_asset = commit && destination_network && destination_network?.tokens.find(token => token.symbol === commit.dstAsset) || null
            const destinationAtomicContract = destination_asset?.contract ? destination_network?.metadata.htlc_erc20_contract : destination_network?.metadata.htlc_contract
            const destinationType = destination_asset?.contract ? 'erc20' : 'native'

            let destinationLock: AssetLock | undefined = undefined

            if (destination_network && destination_provider && destination_network.chain_id && destination_asset) {

                try {
                    const destinationLockId = await destination_provider.getLockIdByCommitId({
                        type: destinationType,
                        chainId: destination_network.chain_id,
                        commitId: commitIds[i].toString(),
                        contractAddress: destinationAtomicContract as `0x${string}`
                    })

                    if (destinationLockId) {
                        destinationLock = await destination_provider.getLock({
                            type: destinationType,
                            lockId: destinationLockId,
                            chainId: destination_network.chain_id,
                            contractAddress: destinationAtomicContract as `0x${string}`
                        })
                    }
                } catch (e) {
                    console.log(e)
                }
            }

            if (commit) {
                const status = commitStatusResolver(commit, destinationLock)
                commits.push({
                    id: commitIds[i].toString(),
                    status,
                    ...commit
                })
            }
        }

        return commits
    }

    const handleOpenCommitDetails = (commit: HistoryCommit) => {
        setSelectedCommit(commit)
        setOpenSwapDetailsModal(true)
    }

    useEffect(() => {
        (async () => {
            if (wallets.length === 0 || !activeNetwork || !activeNetwork.chain_id) return
            setPage(0)
            setIsLastPage(false)
            setLoading(true)

            const commIds = activeNetwork?.metadata.htlc_contract && await source_provider?.getCommits({ contractAddress: activeNetwork?.metadata.htlc_contract as `0x${string}`, chainId: activeNetwork.chain_id, type: 'native' })
            if (commIds) setCommitIds(commIds)
            const erc20CommIds = await source_provider?.getCommits({ contractAddress: activeNetwork?.metadata.htlc_erc20_contract as `0x${string}`, chainId: activeNetwork.chain_id, type: 'erc20' })
            if (erc20CommIds) setErc20CommIds(erc20CommIds)

            const commits = commIds && await getCommitments(0, commIds, activeNetwork?.metadata.htlc_contract, 'native') || []
            const erc20Commits = erc20CommIds && activeNetwork?.metadata.htlc_erc20_contract && await getCommitments(0, erc20CommIds, activeNetwork?.metadata.htlc_erc20_contract, 'erc20') || []
            setCommitments([...commits, ...erc20Commits])

            setPage(1)
            if ((commIds ? (Number(commIds?.length) <= PAGE_SIZE) : true) && (erc20CommIds ? (Number(erc20CommIds?.length) <= PAGE_SIZE) : true)) setIsLastPage(true)
            setLoading(false)
        })()
    }, [router.query, selectedWallet?.address, selectedWallet?.chainId])

    const handleLoadMore = useCallback(async () => {
        const nextPage = page + 1
        setLoading(true)

        const commits = commitIds && activeNetwork?.metadata.htlc_contract && await getCommitments(nextPage, commitIds, activeNetwork?.metadata.htlc_contract, 'native') || []
        const erc20Commits = erc20CommIds && activeNetwork?.metadata.htlc_erc20_contract && await getCommitments(nextPage, erc20CommIds, activeNetwork?.metadata.htlc_erc20_contract, 'erc20') || []

        setCommitments(old => [...(old ? old : []), ...commits, ...erc20Commits])

        setPage(nextPage)
        if ((commitIds ? (Number(commitIds?.length) <= PAGE_SIZE) : true) && (erc20CommIds ? Number(erc20CommIds?.length) <= PAGE_SIZE : true)) setIsLastPage(true)

        setLoading(false)
    }, [page, setCommitments, commitIds, erc20CommIds])

    useEffect(() => {
        if (!selectedWallet) {
            setSelectedProvider(wallets?.[0]?.connector)
        }
    }, [wallets])

    if (wallets.length === 0) return <HistoryWrapper>
        <div className="absolute top-1/4 right-0 text-center w-full px-6">
            <Scroll className='h-40 w-40 text-secondary-700 mx-auto' />
            <p className="my-2 text-xl">It&apos;s empty here</p>
            <p className="px-14 text-primary-text">Connect wallet to inspect your history</p>
            <ConnectButton className="w-full mt-3">
                <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-componentRoundness transform hover:brightness-125 transition duration-200 ease-in-out bg-primary py-3 md:px-3 bg-primary/20 border-none text-primary px-4">
                    <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                        <WalletIcon className='stroke-2 w-6 h-6' strokeWidth={2} />
                    </span>
                    <span className="grow text-center">Connect a wallet</span>
                </div>
            </ConnectButton>
        </div>
    </HistoryWrapper>

    return (
        <HistoryWrapper>
            <WalletSelector wallets={wallets} selectedWallet={selectedProvider} setSelectedWallet={setSelectedProvider} />
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
                                                            dstChain,
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
                                                                    {commit && <StatusIcon commit={commit} />}
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
                                                                                {truncateDecimals(amount, source_token?.precision)}
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
                                    <p className="px-14 text-primary-text">Please select the network in your wallet where you initiated the transfer.</p>
                                </div>
                        }
                        <Modal height="fit" show={openSwapDetailsModal} setShow={setOpenSwapDetailsModal} header="Swap details" modalId="swapHistory">
                            <div className="mt-2">
                                {
                                    selectedCommit && selectedWallet && activeNetwork &&
                                    <CommitDetails commit={selectedCommit} source_network={activeNetwork} />
                                }
                            </div>
                        </Modal>
                    </>
            }
        </HistoryWrapper>
    )
}

type WallectSelectorProps = {
    wallets: Wallet[]
    selectedWallet: string | undefined
    setSelectedWallet: (wallet: string) => void
}

const WalletSelector: FC<WallectSelectorProps> = ({ wallets, selectedWallet, setSelectedWallet }) => {
    const [showModal, setShowModal] = useState(false)

    return <Popover open={showModal} onOpenChange={setShowModal}>
        <PopoverTrigger className="font-semibold text-secondary-text text-xs flex items-center space-x-1">
            <span> Transfered via </span> <span>{selectedWallet}</span> <div>
                <ChevronDown className=" w-4 h-4 " />
            </div>
        </PopoverTrigger>
        <PopoverContent className=' ml-2 mt-1 text-sm p-2 max-w border-none rounded-xl bg-secondary-600 max-w-72 md:max-w-96' align="start">
            <div>
                {
                    wallets.map(wallet => <div key={wallet.address} className={classNames("flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-secondary-700", selectedWallet === wallet.connector && 'bg-secondary-700')} onClick={() => {
                        wallet.connector && setSelectedWallet(wallet.connector)
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

const HistoryWrapper: FC<{ children: ReactNode }> = ({ children }) => {
    const router = useRouter()

    const goBack = useCallback(() => {
        window?.['navigation']?.['canGoBack'] ?
            router.back()
            : router.push({
                pathname: "/",
                query: resolvePersistantQueryParams(router.query)
            })
    }, [router])

    return (
        <div className={`bg-secondary-900 sm:shadow-card rounded-containerRoundness mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px] ${AppSettings.ApiVersion === 'sandbox' && 'border-t-[2px] border-[#D95E1B]'}`}>
            {
                AppSettings.ApiVersion === 'sandbox' &&
                <div className="absolute -top-1 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                    TESTNET
                </div>
            }
            <HeaderWithMenu goBack={goBack} />
            <div className="px-6 mt-3">
                {children}
            </div>
            <div id="widget_root" />
        </div>
    )
}

export default CommittmentsHistory;