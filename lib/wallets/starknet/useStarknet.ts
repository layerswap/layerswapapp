import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { useCallback } from "react";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { Call, Contract, RpcProvider, shortString } from "starknet";
import PHTLCAbi from "../../../lib/abis/atomic/STARKNET_PHTLC.json"
import ETHABbi from "../../../lib/abis/STARKNET_ETH.json"
import { CommitmentParams, CreatePreHTLCParams, GetCommitsParams, LockParams, RefundParams } from "../phtlc";
import { BigNumberish, ethers } from "ethers";
import { Commit } from "../../../Models/PHTLC";
import { toHex } from "viem";
import formatAmount from "../../formatAmount";
import { useSettingsState } from "../../../context/settings";

export default function useStarknet(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...commonSupportedNetworks,
        KnownInternalNames.Networks.ParadexMainnet,
        KnownInternalNames.Networks.ParadexTestnet,
    ]

    const name = 'starknet'
    const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
    const nodeUrl = 'https://starknet-sepolia.public.blastapi.io'
    const wallets = useWalletStore((state) => state.connectedWallets)
    const { networks } = useSettingsState()
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const wallet = wallets.find(wallet => wallet.providerName === name)

    const getWallet = () => {
        return wallet
    }

    const connectWallet = useCallback(async (chain: string) => {
        const constants = (await import('starknet')).constants
        const chainId = process.env.NEXT_PUBLIC_API_VERSION === "sandbox" ? constants.NetworkName.SN_SEPOLIA : constants.NetworkName.SN_MAIN
        const connect = (await import('starknetkit')).connect
        try {
            const { wallet } = await connect({
                argentMobileOptions: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/v8',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                    chainId: chainId as any
                },
                dappName: 'Layerswap',
                modalMode: 'alwaysAsk',
                provider: new RpcProvider({
                    nodeUrl: nodeUrl,
                })
            })
            if (wallet && chain && ((wallet.provider?.chainId && wallet.provider?.chainId != constants.StarknetChainId[chainId]) || (wallet.provider?.provider?.chainId && wallet.provider?.provider?.chainId != constants.StarknetChainId[chainId]))) {
                await disconnectWallet()
                const errorMessage = `Please switch the network in your wallet to ${chainId === constants.NetworkName.SN_SEPOLIA ? 'Sepolia' : 'Mainnet'} and click connect again`
                throw new Error(errorMessage)
            }

            if (wallet && wallet.account && wallet.isConnected) {
                //TODO fix this
                const chainString = wallet.chainId
                const chainid = constants.StarknetChainId[chainString] || chainString
                addWallet({
                    address: wallet.account.address,
                    chainId: chainid || wallet.provider?.chainId || wallet.provider?.provider?.chainId || constants.StarknetChainId.SN_SEPOLIA,
                    icon: resolveWalletConnectorIcon({ connector: wallet.name, address: wallet.account.address }),
                    connector: wallet.name,
                    providerName: name,
                    metadata: {
                        starknetAccount: wallet
                    }
                })
            } else if (wallet?.isConnected === false) {
                await disconnectWallet()
                connectWallet(chain)
            }

        }
        catch (e) {
            console.log(e)
            toast.error(e.message, { duration: 30000 })
        }
    }, [addWallet])

    const disconnectWallet = async () => {
        const disconnect = (await import('starknetkit')).disconnect
        try {
            await disconnect({ clearLastWallet: true })
            removeWallet(name)
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async (chain: string) => {
        await disconnectWallet()
        await connectWallet(chain)
    }

    const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
    const timeLock = Math.floor((Date.now() + LOCK_TIME) / 1000)

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, tokenContractAddress, amount, decimals, atomicContract: atomicAddress } = params
        if (!wallet?.metadata?.starknetAccount?.account) {
            throw new Error('Wallet not connected')
        }
        if (!tokenContractAddress) {
            throw new Error('No token contract address')
        }

        try {
            const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toNumber().toString()

            const erc20Contract = new Contract(
                ETHABbi,
                tokenContractAddress,
                wallet.metadata?.starknetAccount?.account,
            )
            const increaseAllowanceCall: Call = erc20Contract.populate("increaseAllowance", [atomicAddress, parsedAmount])

            const args = [
                parsedAmount,
                destinationChain,
                destinationAsset,
                address,
                sourceAsset.symbol,
                lpAddress,
                timeLock,
                tokenContractAddress,
            ]

            const atomicContract = new Contract(
                PHTLCAbi,
                atomicAddress,
                wallet.metadata?.starknetAccount?.account,
            )

            const committmentCall: Call = atomicContract.populate("commit", args)

            const trx = (await wallet?.metadata?.starknetAccount?.account?.execute([increaseAllowanceCall, committmentCall]))

            const commitTransactionData = await wallet.metadata.starknetAccount.provider.waitForTransaction(
                trx.transaction_hash
            );
            const parsedEvents = atomicContract.parseEvents(commitTransactionData);
            const tokenCommitedEvent = parsedEvents.find((event: any) => event.TokenCommitted || event?.['htlc::Erc20github::HashedTimelockERC20::TokenCommitted'])

            const commitId = tokenCommitedEvent?.TokenCommitted?.commitId || tokenCommitedEvent?.['htlc::Erc20github::HashedTimelockERC20::TokenCommitted']?.commitId
            if (!commitId) {
                throw new Error('No commit id')
            }

            const res = toHex(commitId as bigint, { size: 32 })
            return { hash: trx.transaction_hash as `0x${string}`, commitId: res as `0x${string}` }
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
        }

    }

    const claim = () => {
        throw new Error('Not implemented')
    }

    const refund = async (params: RefundParams) => {
        const { contractAddress: atomicAddress, id } = params

        if (!wallet?.metadata?.starknetAccount?.account) {
            throw new Error('Wallet not connected')
        }

        const atomicContract = new Contract(
            PHTLCAbi,
            atomicAddress,
            wallet.metadata?.starknetAccount?.account,
        )

        const refundCall: Call = atomicContract.populate('refund', [id])
        const trx = (await wallet?.metadata?.starknetAccount?.account?.execute(refundCall))

        if (!trx) {
            throw new Error("No result")
        }
        return trx.transaction_hash
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        const { id, contractAddress, chainId } = params

        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress,
            new RpcProvider({
                nodeUrl: nodeUrl,
            })
        )

        const result = await atomicContract.functions.getDetails(id)

        if (!result) {
            throw new Error("No result")
        }
        const networkToken = networks.find(network => chainId && Number(network.chain_id) == Number(chainId))?.tokens.find(token => token.symbol === shortString.decodeShortString(ethers.utils.hexlify(result.srcAsset as BigNumberish)))

        const parsedResult = {
            dstAddress: result.dstAddress,
            dstChain: shortString.decodeShortString(ethers.utils.hexlify(result.dstChain as BigNumberish)),
            dstAsset: shortString.decodeShortString(ethers.utils.hexlify(result.dstAsset as BigNumberish)),
            srcAsset: shortString.decodeShortString(ethers.utils.hexlify(result.srcAsset as BigNumberish)),
            sender: ethers.utils.hexlify(result.sender as BigNumberish),
            srcReceiver: ethers.utils.hexlify(result.srcReceiver as BigNumberish),
            timelock: Number(result.timelock),
            id: result.lockId && toHex(result.id, { size: 32 }),
            amount: formatAmount(Number(result.amount), networkToken?.decimals),
            refunded: result.refunded,
            hashlock: result.hashlock && toHex(result.hashlock, { size: 32 }),
            secret: result.secret || null,
            redeemed: result.redeemed || false,
        }

        return parsedResult
    }

    const addLock = async (params: CommitmentParams & LockParams) => {
        const { id, contractAddress } = params

        if (!wallet?.metadata?.starknetAccount?.account) {
            throw new Error('Wallet not connected')
        }
        const args = [
            id,
            timeLock
        ]
        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress,
            wallet.metadata?.starknetAccount?.account,
        )

        const committmentCall: Call = atomicContract.populate("addLock", args)

        const trx = (await wallet?.metadata?.starknetAccount?.account?.execute(committmentCall))
        return { hash: trx.transaction_hash as `0x${string}`, result: trx.transaction_hash as `0x${string}` }
    }


    const getContracts = async (params: GetCommitsParams) => {
        const { contractAddress } = params

        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress,
            new RpcProvider({
                nodeUrl: nodeUrl,
            })
        )

        if (!wallet?.address) {
            throw new Error('No connected wallet')
        }

        const result = await atomicContract.functions.getCommits(wallet?.address)

        if (!result) {
            throw new Error("No result")
        }

        return result.reverse().map((commit: any) => toHex(commit, { size: 32 }))
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,

        createPreHTLC,
        claim,
        refund,
        getDetails,
        addLock: addLock,
        getContracts
    }
}