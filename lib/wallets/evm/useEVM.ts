import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useAccount, useConfig, useDisconnect } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useEffect, useState } from "react"
import { CreatyePreHTLCParams, CommitmentParams } from "../phtlc"
import PHTLCAbi from "../../../lib/abis/atomic/EVM_PHTLC.json"
import { writeContract, simulateContract, watchContractEvent, readContract } from '@wagmi/core'
import { ethers } from "ethers"
import { sepolia } from "viem/chains"

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
                icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account.connector), address: account.address })
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

    const LOCK_TIME = 1000 * 60 * 60 * 3 // 3 hours
    const messanger = "0x39c58617d355d8B432a3675714b93eC840872236"

    const createPreHTLC = async (params: CreatyePreHTLCParams) => {
        const { destinationChain, sourceChain, destinationAsset, sourceAsset, lpAddress, address, tokenContractAddress, amount, decimals, atomicContrcat } = params
        if (!account.address) {
            throw Error("Wallet not connected")
        }
        if (isNaN(Number(sourceChain))) {
            throw Error("Invalid source chain")
        }

        const timeLock = Date.now() + LOCK_TIME
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toBigInt()

        const { request, result } = await simulateContract(config, {
            abi: PHTLCAbi,
            address: atomicContrcat,
            functionName: 'createP',
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
            chainId: Number(sourceChain),
            value: parsedAmount,
        })

        const hash = await writeContract(config, request)
        console.log('Hash:', hash, 'Result:', result)
        return { hash, commitId: result }
    }
    const convertToHTLC = () => {
        throw new Error('Not implemented')
    }
    const claim = () => {
        throw new Error('Not implemented')
    }
    const refund = () => {
        throw new Error('Not implemented')
    }
    const getPreHTLC = () => {
        throw new Error('Not implemented')
    }


    const waitForLock = async (params: CommitmentParams, onLog: (data: any) => void) => {
        const { chainId, commitId, contractAddress } = params
        const unwatch = watchContractEvent(config, {
            address: contractAddress,
            abi: PHTLCAbi,
            eventName: 'TokenLocked',
            onLogs(logs) {
                console.log('New logs!', logs)
                debugger
                onLog(logs)
            },
            chainId: Number(chainId),
        })
        return unwatch
    }

    const getCommitment = async (commitId: string, chainId: string, contractAddress: `0x${string}`) => {

        const result = await readContract(config, {
            abi: PHTLCAbi,
            address: contractAddress,
            functionName: 'getCommitmentDetails',
            args: [commitId],
            chainId: Number(chainId),
        })

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



        createPreHTLC,
        convertToHTLC,
        claim,
        refund,
        getPreHTLC,
        waitForLock,
    }
}