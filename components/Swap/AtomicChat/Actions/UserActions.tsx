import { FC, useEffect, useRef, useState } from "react";
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./ActionStatus";
import { WalletActionButton } from "../buttons";

export const UserCommitAction: FC = () => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onCommit, commitId, setCommitment, setError } = useAtomicState();
    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const wallet = source_provider?.getConnectedWallet()
    const requestingCommit = useRef(false)

    const handleCommit = async () => {
        try {
            if (!amount) {
                throw new Error("No amount specified")
            }
            if (!address) {
                throw new Error("Please enter a valid address")
            }
            if (!destination_network) {
                throw new Error("No destination chain")
            }
            if (!source_network?.chain_id) {
                throw new Error("No source chain")
            }
            if (!source_asset) {
                throw new Error("No source asset")
            }
            if (!destination_asset) {
                throw new Error("No destination asset")
            }


            if (!source_provider) {
                throw new Error("No source_provider")
            }
            if (!destination_provider) {
                throw new Error("No destination_provider")
            }
            const { commitId } = await source_provider.createPreHTLC({
                address,
                amount: amount.toString(),
                destinationChain: destination_network.name,
                sourceChain: source_network.name,
                destinationAsset: destination_asset.symbol,
                sourceAsset: source_asset.symbol,
                lpAddress: source_network.metadata.lp_address,
                tokenContractAddress: source_asset.contract as `0x${string}`,
                decimals: source_asset.decimals,
                atomicContrcat: source_network.metadata.htlc_contract as `0x${string}`,
                chainId: source_network.chain_id,
            })
            onCommit(commitId)
        }
        catch (e) {
            setError(e.details || e.message)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (source_network && commitId && !requestingCommit.current) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")

                    const data = await source_provider.getCommitment({
                        chainId: source_network.chain_id,
                        commitId: commitId,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    if (data && data.sender != '0x0000000000000000000000000000000000000000') {
                        setCommitment(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => {
            clearInterval(commitHandler)
        }
    }, [source_network])

    if (!source_network) return <></>

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            commitId ?
                <ActionStatus
                    status="pending"
                    title='Waiting for confirmations'
                />
                :
                source_network.chain_id && <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network}
                    networkChainId={source_network.chain_id}
                    onClick={handleCommit}
                >Commit</WalletActionButton>
        }
    </div>
}


export const UserLockAction: FC = () => {
    const { source_network, commitId, hashLock, committment, setCommitment, setUserLocked, userLocked, setError } = useAtomicState()

    const { getWithdrawalProvider } = useWallet()

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const handleLockAssets = async () => {
        try {
            if (!source_network?.chain_id)
                throw Error("No chain id")
            if (!source_provider)
                throw new Error("No source provider")
            if (!hashLock)
                throw new Error("No destination hashlock")

            await source_provider.lockCommitment({
                chainId: source_network.chain_id,
                commitId: commitId as string,
                lockId: hashLock,
                contractAddress: source_network.metadata.htlc_contract as `0x${string}`
            })
            setUserLocked(true)
        }
        catch (e) {
            setError(e.details || e.message)
        }
        finally {
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (!committment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")

                    const data = await source_provider.getCommitment({
                        chainId: source_network.chain_id,
                        commitId: commitId as string,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    if (data?.locked) {
                        setCommitment(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_provider])


    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            userLocked ?
                <ActionStatus
                    status="pending"
                    title='Waiting for confirmations'
                />
                :
                source_network && <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network}
                    networkChainId={Number(source_network.chain_id)}
                    onClick={handleLockAssets}
                >
                    Lock
                </WalletActionButton>
        }
    </div>

}

export const UserRefundAction: FC = () => {
    const { source_network, commitId, sourceLock, setCompletedRefundHash, committment, setCommitment, setError, setHashLock, setDestinationLock } = useAtomicState()
    const { getWithdrawalProvider } = useWallet()
    const [requestedRefund, setRequestedRefund] = useState(false)

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")

            const res = await source_provider?.refund({
                commitId: commitId,
                lockId: sourceLock?.hashlock,
                chainId: source_network.chain_id ?? '',
                contractAddress: source_network.metadata.htlc_contract as `0x${string}`
            })
            setCompletedRefundHash(res)
            setRequestedRefund(true)
        }
        catch (e) {
            setError(e.details || e.message)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (!committment?.uncommitted && !sourceLock) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")

                    const data = await source_provider.getCommitment({
                        chainId: source_network.chain_id,
                        commitId: commitId as string,
                        contractAddress: source_network.metadata.htlc_contract as `0x${string}`
                    })
                    if (data?.uncommitted) {
                        setCommitment(data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_provider])

    useEffect(() => {
        let lockHandler: any = undefined
        if (source_provider && sourceLock && !sourceLock.unlocked) {
            lockHandler = setInterval(async () => {
                if (!source_network.chain_id)
                    throw Error("No chain id")

                const data = await source_provider.getLock({
                    chainId: source_network.chain_id,
                    lockId: sourceLock.hashlock as string,
                    contractAddress: source_network.metadata.htlc_contract as `0x${string}`,
                })
                if (data.unlocked) {
                    setDestinationLock(data)
                    clearInterval(lockHandler)
                }
            }, 5000)
        }
        return () => {
            lockHandler && clearInterval(lockHandler);
        };
    }, [source_provider])

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            requestedRefund ?
                <ActionStatus
                    status="pending"
                    title={'Waiting for confirmations'}
                />
                :
                <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network!}
                    networkChainId={Number(source_network?.chain_id)}
                    onClick={handleRefundAssets}
                >
                    Refund
                </WalletActionButton>
        }
    </div>
}