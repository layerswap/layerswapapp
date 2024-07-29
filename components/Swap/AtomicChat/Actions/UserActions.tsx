import { FC, useEffect, useRef, useState } from "react";
import useWallet from "../../../../hooks/useWallet";
import { NETWORKS_DETAILS } from "../../Atomic";
import { WalletActionButton } from "../butons";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./ActionStatus";

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

            const details = NETWORKS_DETAILS[source_network.name]

            if (!source_provider) {
                throw new Error("No source_provider")
            }
            if (!destination_provider) {
                throw new Error("No destination_provider")
            }
            const { commitId, hash } = await source_provider.createPreHTLC({
                abi: details.abi,
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
                    console.log('******** polling')
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")
                    const details = NETWORKS_DETAILS[source_network.name]
                    if (!details)
                        throw new Error("No source network details")

                    const data = await source_provider.getCommitment({
                        abi: details.abi,
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
    const [lockLoading, setLockLoading] = useState(false)

    const { getWithdrawalProvider } = useWallet()

    const source_provider = source_network && getWithdrawalProvider(source_network)
    const wallet = source_provider?.getConnectedWallet()

    const handleLockAssets = async () => {
        try {
            setLockLoading(true)
            if (!source_network?.chain_id)
                throw Error("No chain id")
            if (!source_provider)
                throw new Error("No source provider")
            if (!hashLock)
                throw new Error("No destination hashlock")
            const details = NETWORKS_DETAILS[source_network.name]
            if (!details)
                throw new Error("No source network details")

            const { hash, result } = await source_provider.lockCommitment({
                abi: details.abi,
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
            setLockLoading(false)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (!committment?.locked) {
            (async () => {
                commitHandler = setInterval(async () => {
                    console.log('******** polling')
                    if (!source_network?.chain_id)
                        throw Error("No chain id")
                    if (!source_provider)
                        throw new Error("No source provider")
                    const details = NETWORKS_DETAILS[source_network.name]
                    if (!details)
                        throw new Error("No source network details")

                    const data = await source_provider.getCommitment({
                        abi: details.abi,
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