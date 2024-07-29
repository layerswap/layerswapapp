import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { useCallback } from "react";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { Call, Contract, hash, shortString } from "starknet";
import PHTLCAbi from "../../../lib/abis/atomic/STARKNET_PHTLC.json"
import ETHABbi from "../../../lib/abis/STARKNET_ETH.json"
import { CommitmentParams, CreatyePreHTLCParams, LockParams } from "../phtlc";
import { BigNumberish, ethers } from "ethers";
import { AssetLock, Commit } from "../../../Models/PHTLC";

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
    const wallets = useWalletStore((state) => state.connectedWallets)

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
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                    chainId: chainId as any
                },
                dappName: 'Layerswap',
                modalMode: 'alwaysAsk'
            })
            if (wallet && chain && ((wallet.provider?.chainId && wallet.provider?.chainId != constants.StarknetChainId[chainId]) || (wallet.provider?.provider?.chainId && wallet.provider?.provider?.chainId != constants.StarknetChainId[chainId]))) {
                await disconnectWallet()
                const errorMessage = `Please switch the network in your wallet to ${chainId === constants.NetworkName.SN_SEPOLIA ? 'Sepolia' : 'Mainnet'} and click connect again`
                throw new Error(errorMessage)
            }

            if (wallet && wallet.account && wallet.isConnected) {
                addWallet({
                    address: wallet.account.address,
                    chainId: wallet.provider?.chainId || wallet.provider?.provider?.chainId,
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

    const LOCK_TIME = 1000 * 60 * 60 * 3 // 3 hours
    const messanger = "0x152747029e738c20a4ecde5ef869ea072642938d62f0aa7f3d0e9dfb5051cb9"

    const createPreHTLC = async (params: CreatyePreHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, tokenContractAddress, amount, decimals, abi, atomicContrcat: atomicAddress, } = params
        if (!wallet?.metadata?.starknetAccount?.account) {
            throw new Error('Wallet not connected')
        }
        if (!tokenContractAddress) {
            throw new Error('No token contract address')
        }
        const timeLock = Math.floor((Date.now() + LOCK_TIME) / 1000)
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
            sourceAsset,
            lpAddress,
            timeLock,
            messanger,
            tokenContractAddress,
        ]

        const atomicContract = new Contract(
            PHTLCAbi,
            atomicAddress,
            wallet.metadata?.starknetAccount?.account,
        )
        const committmentCall: Call = atomicContract.populate("commit1", args)

        const trx = (await wallet?.metadata?.starknetAccount?.account?.execute([increaseAllowanceCall, committmentCall]))
        const commitTransactionData = await wallet.metadata.starknetAccount.provider.waitForTransaction(
            trx.transaction_hash
        );
        console.log('trx', trx.transaction_hash)
        const parsedEvents = atomicContract.parseEvents(commitTransactionData);
        console.log('parsedEvents', parsedEvents)
        const tokenCommitedEvent = parsedEvents.find((event: any) => event.TokenCommitted)
        const commitId = tokenCommitedEvent?.TokenCommitted.commitId
        if (!commitId) {
            throw new Error('No commit id')
        }
        const res = ethers.utils.hexlify(commitId as BigNumberish)
        console.log("result", res)
        return { hash: trx.transaction_hash as `0x${string}`, commitId: res as `0x${string}` }
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
    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {
        const { abi, chainId, commitId, contractAddress } = params

        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress
        )

        const result = await atomicContract.functions.getCommitDetails(commitId)

        if (!result) {
            throw new Error("No result")
        }

        const parsedResult = {
            dstAddress: ethers.utils.hexlify(result.dstAddress as BigNumberish),

            dstChain: shortString.decodeShortString(ethers.utils.hexlify(result.dstChain as BigNumberish)),
            dstAsset: shortString.decodeShortString(ethers.utils.hexlify(result.dstAsset as BigNumberish)),
            srcAsset: shortString.decodeShortString(ethers.utils.hexlify(result.srcAsset as BigNumberish)),
            sender: ethers.utils.hexlify(result.sender as BigNumberish),
            srcReceiver: ethers.utils.hexlify(result.srcReceiver as BigNumberish),
            timelock: Number(result.timelock),
            amount: result.amount,
            messenger: ethers.utils.hexlify(result.messenger as BigNumberish),
            locked: result.locked,
            uncommitted: result.uncommitted
        }

        return parsedResult
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { abi, chainId, commitId, contractAddress, lockId } = params
        if (!wallet?.metadata?.starknetAccount?.account) {
            throw new Error('Wallet not connected')
        }
        const args = [
            commitId,
        ]
        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress,
            wallet.metadata?.starknetAccount?.account,
        )

        const committmentCall: Call = atomicContract.populate("lockCommit", args)

        const trx = (await wallet?.metadata?.starknetAccount?.account?.execute(committmentCall))
        console.log('Hash:', hash, 'Result:', trx)
        return { hash: trx.transaction_hash as `0x${string}`, result: trx.transaction_hash as `0x${string}` }
    }

    const getLock = async (params: LockParams): Promise<AssetLock> => {

        const { abi, chainId, lockId, contractAddress, lockDataResolver } = params

        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress
        )
        const result = await atomicContract.functions.getLockDetails(lockId)

        const parsedResult: AssetLock = {
            dstAddress: ethers.utils.hexlify(result.dstAddress as BigNumberish),
            dstChain: shortString.decodeShortString(ethers.utils.hexlify(result.dstChain as BigNumberish)),
            dstAsset: shortString.decodeShortString(ethers.utils.hexlify(result.dstAsset as BigNumberish)),
            srcAsset: shortString.decodeShortString(ethers.utils.hexlify(result.srcAsset as BigNumberish)),
            timelock: Number(result.timelock),
            amount: result.amount,
            hashlock: ethers.utils.hexlify(result.hashlock as BigNumberish),
            redeemed: result.redeemed,
            secret: Number(result.secret),
            sender: ethers.utils.hexlify(result.sender as BigNumberish) as `0x${string}`,
            srcReceiver: ethers.utils.hexlify(result.srcReceiver as BigNumberish) as `0x${string}`,
            unlocked: result.unlocked
        }
        debugger
        return parsedResult
    }
    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { abi, chainId, commitId, contractAddress } = params
        debugger
        const atomicContract = new Contract(
            PHTLCAbi,
            contractAddress
        )
        const result = await atomicContract.functions.getLockIdByCommitId(commitId)
        const hexedResult = ethers.utils.hexlify(result)

        return hexedResult
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
        convertToHTLC,
        claim,
        refund,
        waitForLock(props: { commitId: string, chainId: string, contractAddress: `0x${string}` }) {
            throw new Error('Not implemented')
        },
        getCommitment,
        getLock,
        lockCommitment,
        getLockIdByCommitId,
    }
}