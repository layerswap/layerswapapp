import { Context, createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { Commit } from '../Models/PHTLC';
import { Network, Token } from '../Models/Network';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { CommitFromApi } from '../lib/layerSwapApiClient';
import { toHex } from 'viem';

const AtomicStateContext = createContext<DataContextType | null>(null);

type DataContextType = {
    source_network?: Network,
    destination_network?: Network,
    source_asset?: Token,
    destination_asset?: Token,
    address?: string,
    amount?: number,
    commitId?: string,
    commitTxId?: string,
    destinationDetails?: Commit,
    userLocked?: boolean,
    sourceDetails?: Commit,
    isTimelockExpired?: boolean,
    completedRefundHash?: string,
    error: string | undefined,
    commitFromApi?: CommitFromApi,
    onCommit: (commitId: string, txId: string) => void;
    setDestinationDetails: (data: Commit) => void;
    setSourceDetails: (data: Commit) => void;
    setUserLocked: (locked: boolean) => void,
    setCompletedRefundHash: (hash: string) => void
    setError(error: string | undefined): void
}

export function AtomicProvider({ children }) {
    const router = useRouter()
    const {
        address,
        amount,
        destination,
        destination_asset,
        source,
        source_asset
    } = router.query

    const [commitId, setCommitId] = useState<string | undefined>(router.query.commitId as string | undefined)
    const [commitTxId, setCommitTxId] = useState<string | undefined>(router.query.txId as string | undefined)
    const { networks } = useSettingsState()
    const [sourceDetails, setSourceDetails] = useState<Commit | undefined>(undefined)
    const [destinationDetails, setDestinationDetails] = useState<Commit | undefined>(undefined)

    const [userLocked, setUserLocked] = useState<boolean>(false)

    const [isTimelockExpired, setIsTimelockExpired] = useState<boolean>(false)
    const [completedRefundHash, setCompletedRefundHash] = useState<string | undefined>(undefined)
    const [error, setError] = useState<string | undefined>(undefined)

    const source_network = networks.find(n => n.name.toUpperCase() === (source as string)?.toUpperCase())
    const destination_network = networks.find(n => n.name.toUpperCase() === (destination as string)?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    const fetcher = (args) => fetch(args).then(res => res.json())
    const url = process.env.NEXT_PUBLIC_LS_API
    const parsedCommitId = commitId ? toHex(BigInt(commitId)) : undefined
    const { data } = useSWR<ApiResponse<CommitFromApi>>(parsedCommitId ? `${url}/api/swap/${parsedCommitId}` : null, fetcher, { refreshInterval: 5000 })
    const commitFromApi = data?.data

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (!sourceDetails || isTimelockExpired || (sourceDetails.hashlock && !destinationDetails?.hashlock)) return
        const time = (Number(sourceDetails?.timelock) * 1000) - Date.now()


        if (!sourceDetails.hashlock || (destinationDetails && destinationDetails.claimed == 1)) {
            if (time < 0) {
                setIsTimelockExpired(true)
                return
            }
            timer = setInterval(() => {
                if (!isTimelockExpired) {
                    setIsTimelockExpired(true)
                    clearInterval(timer)
                }
            }, time);

        }

        return () => timer && clearInterval(timer)

    }, [sourceDetails, destinationDetails])

    const handleCommited = (commitId: string, txId: string) => {
        setCommitId(commitId)
        setCommitTxId(txId)
        router.replace({
            pathname: router.pathname,
            query: { ...router.query, commitId, txId }
        }, undefined, { shallow: true })
    }

    return (
        <AtomicStateContext.Provider value={{
            source_network,
            onCommit: handleCommited,
            source_asset: source_token,
            destination_asset: destination_token,
            address: address as string,
            amount: amount ? Number(amount) : undefined,
            destination_network,
            commitId,
            commitTxId,
            sourceDetails,
            destinationDetails,
            userLocked,
            isTimelockExpired,
            completedRefundHash,
            error,
            commitFromApi,
            setDestinationDetails,
            setSourceDetails,
            setUserLocked,
            setCompletedRefundHash,
            setError
        }}>
            {children}
        </AtomicStateContext.Provider>
    )
}

export function useAtomicState() {
    const data = useContext<DataContextType>(AtomicStateContext as Context<DataContextType>);

    if (data === undefined) {
        throw new Error('useAtomicState must be used within a MenuStateProvider');
    }

    return data;
}