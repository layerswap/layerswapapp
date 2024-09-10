import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useAccount, useConfig, useDisconnect } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useEffect, useState } from "react"
import { CreatePreHTLCParams, CommitmentParams, LockParams, GetCommitsParams, RefundParams } from "../phtlc"
import { writeContract, simulateContract, readContract, waitForTransactionReceipt } from '@wagmi/core'
import { ethers } from "ethers"
import { AssetLock, Commit } from "../../../Models/PHTLC"
import PHTLCAbi from "../../../lib/abis/atomic/EVM_PHTLC.json"
import ERC20PHTLCAbi from "../../../lib/abis/atomic/EVMERC20_PHTLC.json"
import IMTBLZKERC20 from "../../../lib/abis/IMTBLZKERC20.json"
import { toHex } from "viem"
import formatAmount from "../../formatAmount"

export default function useEVM(): WalletProvider {
    const { networks } = useSettingsState()
    const [shouldConnect, setShouldConnect] = useState(false)
    const { disconnectAsync } = useDisconnect()
    const config = useConfig()

    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.EVM && network.name !== KnownInternalNames.Networks.RoninMainnet).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ParadexMainnet,
        KnownInternalNames.Networks.ParadexTestnet,
    ]

    const autofillSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.BrineMainnet,
    ]

    const name = 'evm'
    const account = useAccount()
    const { openConnectModal } = useConnectModal()

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const getWallet = () => {
        if (account && account.address && account.connector) {
            const connector = account.connector.id

            return {
                address: account.address,
                connector: account.connector.name || connector.charAt(0).toUpperCase() + connector.slice(1),
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account.connector), address: account.address }),
                chainId: account.chainId
            }
        }
    }

    const connectWallet = () => {
        try {
            return openConnectModal && openConnectModal()
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = async () => {
        try {
            account.connector && await account.connector.disconnect()
            await disconnectAsync()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
            account.connector && await account.connector.disconnect()
            await disconnectAsync()
            setShouldConnect(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
    const timeLockMS = Date.now() + LOCK_TIME
    const timeLock = Math.floor(timeLockMS / 1000)

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, amount, decimals, atomicContract, chainId } = params
        if (!account.address) {
            throw Error("Wallet not connected")
        }
        if (isNaN(Number(chainId))) {
            throw Error("Invalid source chain")
        }
        if (!lpAddress) {
            throw Error("No LP address")
        }
        if (!atomicContract) {
            throw Error("No contract address")
        }
        const messenger = toHex(0, { size: 20 })

        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toBigInt()

        const abi = sourceAsset.contract ? ERC20PHTLCAbi : PHTLCAbi

        let simulationData: any = {
            abi: abi,
            address: atomicContract,
            functionName: 'commit',
            args: [
                [destinationChain],
                [destinationAsset],
                [lpAddress],
                destinationChain,
                destinationAsset,
                address,
                sourceAsset.symbol,
                lpAddress,
                timeLock,
                messenger,
            ],
            chainId: Number(chainId),
        }

        if (sourceAsset.contract) {
            simulationData.args = [
                ...simulationData.args,
                parsedAmount as any,
                sourceAsset.contract
            ]
            const allowance = await readContract(config, {
                abi: IMTBLZKERC20,
                address: sourceAsset.contract as `0x${string}`,
                functionName: 'allowance',
                args: [account.address, atomicContract],
                chainId: Number(chainId),
            })

            if (Number(allowance) < parsedAmount) {
                const res = await writeContract(config, {
                    abi: IMTBLZKERC20,
                    address: sourceAsset.contract as `0x${string}`,
                    functionName: 'approve',
                    args: [atomicContract, parsedAmount],
                    chainId: Number(chainId),
                })

                await waitForTransactionReceipt(config, {
                    chainId: Number(chainId),
                    hash: res,
                })
            }

        } else {
            simulationData.value = parsedAmount as any
        }

        const { request, result } = await simulateContract(config, simulationData)

        const hash = await writeContract(config, request)
        return { hash, commitId: (result as string) }
    }

    const claim = () => {
        throw new Error('Not implemented')
    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {
        const { chainId, commitId, contractAddress, type, } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const result: any = await readContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'getCommitDetails',
            args: [commitId],
            chainId: Number(chainId),
        })

        const networkToken = networks.find(network => chainId && network.chain_id == chainId)?.tokens.find(token => token.symbol === result.srcAsset)

        const parsedResult = {
            ...result,
            amount: formatAmount(Number(result.amount), networkToken?.decimals),
            timelock: Number(result.timelock)
        }

        if (!result) {
            throw new Error("No result")
        }
        return parsedResult as Commit
    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { chainId, commitId, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const result = await readContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'getLockIdByCommitId',
            args: [commitId],
            chainId: Number(chainId),
        })

        if (!result || result === '0x0000000000000000000000000000000000000000000000000000000000000000') return null

        return result as `0x${string}`
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { chainId, commitId, contractAddress, lockId, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const { request, result } = await simulateContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'lockCommitment',
            args: [commitId, lockId, timeLock],
            chainId: Number(chainId),
        })

        const hash = await writeContract(config, request)
        return { hash, result: result }
    }

    const getLock = async (params: LockParams): Promise<AssetLock | undefined> => {
        const { chainId, lockId, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const result: any = await readContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'getLockDetails',
            args: [lockId],
            chainId: Number(chainId),
        })
        const networkToken = networks.find(network => chainId && Number(network.chain_id) == Number(chainId))?.tokens.find(token => token.symbol === result.dstAsset)

        if (result.sender !== '0x0000000000000000000000000000000000000000' || result.sender !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            const parsedResult = {
                ...result,
                amount: formatAmount(Number(result.amount), networkToken?.decimals),
                timelock: Number(result.timelock),
                secret: Number(result.secret)
            }

            if (!result) {
                throw new Error("No result")
            }
            return parsedResult as AssetLock
        }

    }

    const refund = async (params: RefundParams) => {
        const { chainId, lockId, commit, commitId, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        if (commit.locked && !lockId) {
            throw new Error("No lockId")
        }

        const { request } = await simulateContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: commit.locked ? 'unlock' : 'uncommit',
            args: commit.locked ? [lockId] : [commitId],
            chainId: Number(chainId),
        })

        const result = await writeContract(config, request)

        if (!result) {
            throw new Error("No result")
        }
        return result
    }
    const getCommits = async (params: GetCommitsParams) => {
        const { chainId, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        if (!account.address) {
            throw Error("Wallet not connected")
        }
        const result = await readContract(config, {
            abi: abi,
            address: contractAddress,
            functionName: 'getCommits',
            args: [account.address],
            chainId: Number(chainId),
        })
        if (!result) {
            throw new Error("No result")
        }
        return (result as string[]).reverse()
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        reconnectWallet,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        name,

        getLockIdByCommitId,
        getCommitment,
        createPreHTLC,
        claim,
        refund,
        getLock,
        lockCommitment,

        getCommits
    }
}
