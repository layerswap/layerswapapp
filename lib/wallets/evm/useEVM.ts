import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useAccount, useConfig, useDisconnect } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useEffect, useState } from "react"
import { CreatyePreHTLCParams, CommitmentParams, LockParams, GetCommitsParams, RefundParams } from "../phtlc"
import { writeContract, simulateContract, readContract } from '@wagmi/core'
import { ethers } from "ethers"
import { AssetLock, Commit } from "../../../Models/PHTLC"
import PHTLCAbi from "../../../lib/abis/atomic/EVM_PHTLC.json"

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

    // const LOCK_TIME = 1000 * 60 * 60 * 3 // 3 hours
    const LOCK_TIME = 1000 * 60 * 30 // 30 minutes
    const messanger = "0x39c58617d355d8B432a3675714b93eC840872236"

    const createPreHTLC = async (params: CreatyePreHTLCParams) => {
        const { destinationChain, sourceChain, destinationAsset, sourceAsset, lpAddress, address, amount, decimals, atomicContrcat, chainId } = params
        if (!account.address) {
            throw Error("Wallet not connected")
        }
        if (isNaN(Number(chainId))) {
            throw Error("Invalid source chain")
        }
        if (!lpAddress) {
            throw Error("No LP address")
        }
        if (!atomicContrcat) {
            throw Error("No conteract address")
        }
        const timeLockMS = Date.now() + LOCK_TIME
        const timeLock = Math.floor(timeLockMS / 1000)
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toBigInt()
        const { request, result } = await simulateContract(config, {
            abi: PHTLCAbi,
            address: atomicContrcat,
            functionName: 'commit',
            args: [
                [destinationChain],
                [destinationAsset],
                [lpAddress],
                destinationChain,
                destinationAsset,
                address,
                sourceAsset,
                lpAddress,
                timeLock,
                messanger,
            ],
            chainId: Number(chainId),
            value: parsedAmount,
        })

        const hash = await writeContract(config, request)
        return { hash, commitId: (result as string) }
    }

    const convertToHTLC = () => {
        throw new Error('Not implemented')
    }
    const claim = () => {
        throw new Error('Not implemented')
    }
    const getPreHTLC = () => {
        throw new Error('Not implemented')
    }


    const waitForLock = async (params: CommitmentParams, onLog: (data: any) => void) => {
        throw new Error('Not implemented')
    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {
        const { chainId, commitId, contractAddress } = params
        const result = await readContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: 'getCommitDetails',
            args: [commitId],
            chainId: Number(chainId),
        })
        if (!result) {
            throw new Error("No result")
        }
        return result as Commit
    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { chainId, commitId, contractAddress } = params

        const result = await readContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: 'getLockIdByCommitId',
            args: [commitId],
            chainId: Number(chainId),
        })
        if (!result) {
            throw new Error("No result")
        }
        return result as `0x${string}`
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { chainId, commitId, contractAddress, lockId } = params
        const { request, result } = await simulateContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: 'lockCommitment',
            args: [commitId, lockId],
            chainId: Number(chainId),
        })

        const hash = await writeContract(config, request)
        return { hash, result: result }
    }

    const getLock = async (params: LockParams): Promise<AssetLock> => {
        const { chainId, lockId, contractAddress } = params

        const result = await readContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: 'getLockDetails',
            args: [lockId],
            chainId: Number(chainId),
        })

        if (!result) {
            throw new Error("No result")
        }
        return result as AssetLock
    }

    const refund = async (params: RefundParams) => {
        const { chainId, lockId, commitId, contractAddress } = params

        const { request } = await simulateContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: lockId ? 'unlock' : 'uncommit',
            args: lockId ? [lockId] : [commitId],
            chainId: Number(chainId),
        })

        const result = await writeContract(config, request)

        if (!result) {
            throw new Error("No result")
        }
        return result
    }
    const getCommits = async (params: GetCommitsParams) => {
        const { chainId, contractAddress } = params

        if (!account.address) {
            throw Error("Wallet not connected")
        }

        const result = await readContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: 'getCommits',
            args: [account.address],
            chainId: Number(chainId),
        })
        if (!result) {
            throw new Error("No result")
        }
        return result as Commit[]
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
        convertToHTLC,
        claim,
        refund,
        waitForLock,
        getLock,
        lockCommitment,

        getCommits
    }
}
