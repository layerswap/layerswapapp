import { FC, useEffect, useRef, useState } from "react";
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./ActionStatus";
import { WalletActionButton } from "../buttons";

export const UserCommitAction: FC = () => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onCommit, commitId, setSourceDetails, setError } = useAtomicState();
    const { getWithdrawalProvider } = useWallet()
    const source_provider = source_network && getWithdrawalProvider(source_network)
    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const wallet = source_provider?.getConnectedWallet()
    const requestingCommit = useRef(false)

    const atomicContract = (source_asset?.contract ? source_network?.metadata.htlc_token_contract : source_network?.metadata.htlc_native_contract) as `0x${string}`

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
                sourceAsset: source_asset,
                lpAddress: source_network.metadata.lp_address,
                tokenContractAddress: source_asset.contract as `0x${string}`,
                decimals: source_asset.decimals,
                atomicContract: atomicContract,
                chainId: source_network.chain_id,
            }) || {}
            if (commitId) onCommit(commitId)
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

                    const data = await source_provider.getDetails({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        id: commitId,
                        contractAddress: atomicContract
                    })
                    if (data && data.sender != '0x0000000000000000000000000000000000000000') {
                        setSourceDetails(data)
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
    const { source_network, commitId, sourceDetails, setSourceDetails, setUserLocked, userLocked, setError, source_asset, destinationDetails } = useAtomicState()

    const { getWithdrawalProvider } = useWallet()

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const atomicContract = (source_asset?.contract ? source_network?.metadata.htlc_token_contract : source_network?.metadata.htlc_native_contract) as `0x${string}`

    const handleLockAssets = async () => {
        try {
            if (!source_network?.chain_id)
                throw Error("No chain id")
            if (!source_provider)
                throw new Error("No source provider")
            if (!destinationDetails?.hashlock)
                throw new Error("No destination hashlock")

            await source_provider.addLock({
                type: source_asset?.contract ? 'erc20' : 'native',
                chainId: source_network.chain_id,
                id: commitId as string,
                hashlock: destinationDetails?.hashlock,
                contractAddress: atomicContract,
                lockData: destinationDetails
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
        if (!sourceDetails?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")

                    const data = await source_provider.getDetails({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        id: commitId as string,
                        contractAddress: atomicContract
                    })
                    if (data?.locked) {
                        setSourceDetails(data)
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
                    networkChainId={source_network.chain_id}
                    onClick={handleLockAssets}
                >
                    Lock
                </WalletActionButton>
        }
    </div>

}

export const UserRefundAction: FC = () => {
    const { source_network, commitId, sourceDetails, setCompletedRefundHash, setSourceDetails, setError, source_asset, destination_network, destination_asset, setDestinationDetails } = useAtomicState()
    const { getWithdrawalProvider } = useWallet()
    const [requestedRefund, setRequestedRefund] = useState(false)

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const destination_provider = destination_network && getWithdrawalProvider(destination_network)

    const wallet = source_provider?.getConnectedWallet()

    const sourceAtomicContract = (source_asset?.contract ? source_network?.metadata.htlc_token_contract : source_network?.metadata.htlc_native_contract) as `0x${string}`
    const destinationAtomicContract = (destination_asset?.contract ? destination_network?.metadata.htlc_token_contract : destination_network?.metadata.htlc_native_contract) as `0x${string}`

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!source_network.chain_id) throw new Error("No chain id")

            const res = await source_provider?.refund({
                type: source_asset?.contract ? 'erc20' : 'native',
                id: commitId,
                commit: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chain_id,
                contractAddress: sourceAtomicContract
            })
            setCompletedRefundHash(res)
            setRequestedRefund(true)
        }
        catch (e) {
            setError(e.details || e.message)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined;
        (async () => {
            commitHandler = setInterval(async () => {
                if (!source_network?.chain_id)
                    throw Error("No chain id")
                if (!source_provider)
                    throw new Error("No source provider")

                const data = await source_provider.getDetails({
                    type: source_asset?.contract ? 'erc20' : 'native',
                    chainId: source_network.chain_id,
                    id: commitId as string,
                    contractAddress: sourceAtomicContract
                })
                if (data?.uncommitted) {
                    setSourceDetails(data)
                    clearInterval(commitHandler)
                }
            }, 5000)
        })()
        return () => clearInterval(commitHandler)
    }, [source_provider])

    useEffect(() => {
        let lockHandler: any = undefined
        if (destination_provider) {
            lockHandler = setInterval(async () => {
                if (!destination_network?.chain_id)
                    throw Error("No chain id")

                const data = await destination_provider.getDetails({
                    type: destination_asset?.contract ? 'erc20' : 'native',
                    chainId: destination_network.chain_id,
                    id: sourceDetails?.id as string,
                    contractAddress: destinationAtomicContract,
                })

                if (data) setDestinationDetails(data)
                if (data?.uncommitted) {
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