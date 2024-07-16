import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { useCallback } from "react";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { Call, CallData, Contract, parseCalldataField } from "starknet";
import PHTLCAbi from "../../../lib/abis/atomic/STARKNET_PHTLC.json"
import { call } from "viem/actions";
import { CreatyePreHTLCParams } from "../phtlc";
import { ethers } from "ethers";
import * as Paradex from "../../../components/Swap/Withdraw/Wallet/paradex/lib";

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

    const PHTLC_CONTRACT_ADDRESS = '0x05ebf5ca9020e2c34cb0edbee42ceaf61404a2bbd269837f5fe4cca0c6bf5b90'
    const LOCK_TIME = 1000 * 60 * 60 * 3 // 3 hours
    const messanger = "0x152747029e738c20a4ecde5ef869ea072642938d62f0aa7f3d0e9dfb5051cb9"


    const createPreHTLC = async (params: CreatyePreHTLCParams) => {
        const { destinationChain: chain, destinationAsset, sourceAsset, lpAddress, address, tokenContractAddress, amount, decimals } = params
        if (!wallet?.metadata?.starknetAccount?.account) {
            throw new Error('Wallet not connected')
        }
        if (!tokenContractAddress) {
            throw new Error('No soource wallet contract address')
        }
        const timeLock = Date.now() + LOCK_TIME
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toNumber().toString()

        const increaseAllowanceCall: Call = {
            contractAddress: tokenContractAddress,
            entrypoint: 'increase_allowance',
            calldata: [PHTLC_CONTRACT_ADDRESS, parsedAmount, 0]
        }

        const createP1Call: Call = {
            contractAddress: PHTLC_CONTRACT_ADDRESS,
            entrypoint: 'createP1',
            calldata: [
                chain,
                destinationAsset,
                address,
                sourceAsset,
                lpAddress,
                timeLock,
                0,
                messanger,
                tokenContractAddress,
                parsedAmount,
                0
            ]
        }

        const { transaction_hash } = (await wallet?.metadata?.starknetAccount?.account?.execute(createP1Call))
        debugger
        return transaction_hash
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
    const waitForTransaction = (address: string, chain: string | number) => {
        throw new Error('Not implemented')
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
        getPreHTLC,
        waitForLock(props: { commitId: string, chainId: string, contractAddress: `0x${string}` }) {
            throw new Error('Not implemented')
        },
    }
}