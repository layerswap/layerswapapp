import { Link, ArrowLeftRight, Lock } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../../buttons/submitButton';
import { useSwapDataState } from '../../../../../context/swap';
import toast from 'react-hot-toast';
import { useSettingsState } from '../../../../../context/settings';
import { useAccount, useNetwork } from 'wagmi';
import { LoopringAPI } from '../../../../../lib/loopring/LoopringAPI';
import { ConnectorNames } from '@loopring-web/loopring-sdk';
import { connectProvides } from '@loopring-web/web3-provider';
import { ChangeNetworkButton, ConnectWalletButton } from '../WalletTransfer/buttons';
import * as lp from "@loopring-web/loopring-sdk";
import { generateActivateKeyPair } from '../../../../../lib/loopring/helpers';
import { parseUnits } from 'viem';
import WalletMessage from '../WalletTransfer/message';
import { PublishedSwapTransactionStatus } from '../../../../../lib/layerSwapApiClient';
import { useSwapTransactionStore } from '../../../../../stores/swapTransactionStore';
import SignatureIcon from '../../../../icons/SignatureIcon';
import { evmConnectorNameResolver } from '../../../../../lib/wallets/evm/KnownEVMConnectors';
import { ActivationTokenPicker } from './ActivationTokentPicker';
import { useLoopringAccount } from './hooks';


type Props = {
    depositAddress?: string,
    amount?: number
}

type UnlockedAccountType = {
    raw_data: unknown;
    eddsaKey: {
        keyPair: object;
        formatedPx: string;
        formatedPy: string;
        sk: string;
        counterFactualInfo: lp.CounterFactualInfo;
    };
    apiKey: string;
}

const LoopringWalletWithdraw: FC<Props> = ({ depositAddress, amount }) => {
    const [loading, setLoading] = useState(false);
    const [transferDone, setTransferDone] = useState<boolean>();
    const [activationPubKey, setActivationPubKey] = useState<{ x: string; y: string }>()
    const [unlockedAccount, setUnlockedAccount] = useState<UnlockedAccountType>()
    const [selectedActivationAsset, setSelectedActivationAsset] = useState<string>()
    const { chain } = useNetwork()
    const { swap } = useSwapDataState();
    const { layers } = useSettingsState();
    const { setSwapTransaction } = useSwapTransactionStore();
    const { isConnected, address: fromAddress, connector } = useAccount();
    const { source_network: source_network_internal_name } = swap || {}
    const source_network = layers.find(n => n.internal_name === source_network_internal_name);
    const source_currency = source_network?.assets?.find(c => c.asset.toLocaleUpperCase() === swap?.source_network_asset.toLocaleUpperCase());
    const token = layers?.find(n => swap?.source_network == n?.internal_name)?.assets.find(c => c.asset == swap?.source_network_asset);

    const { account: accInfo, isLoading: loadingAccount, noAccount, mutate: refetchAccount } = useLoopringAccount({ address: fromAddress })
    const loopringWalletResolver = connector && resolveConnectProvedes(evmConnectorNameResolver(connector))

    const unlockAccount = useCallback(async () => {
        setLoading(true)
        try {
            if (!accInfo || !loopringWalletResolver || !token)
                return

            await loopringWalletResolver.resolver({ chainId: LoopringAPI.CHAIN, })
            const unlockedAccountData = await LoopringAPI.userAPI.unLockAccount(
                {
                    keyPair: {
                        web3: connectProvides.usedWeb3 as any,
                        address: accInfo.owner,
                        keySeed: accInfo.keySeed,
                        walletType: loopringWalletResolver.type,
                        chainId: LoopringAPI.CHAIN,
                        accountId: Number(accInfo.accountId),
                    },
                    request: {
                        accountId: accInfo.accountId,
                    },
                },
                accInfo.publicKey
            );
            if (unlockedAccountData["apiKey"]) {
                setUnlockedAccount(unlockedAccountData as UnlockedAccountType)
                await connectProvides.MetaMask({ chainId: LoopringAPI.CHAIN, })
            }
            else {
                //TODO detailed error
                throw Error("Could not unlock account")
            }
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [source_currency, accInfo, loopringWalletResolver, selectedActivationAsset, refetchAccount])

    const activateAccout = useCallback(async () => {
        setLoading(true)
        try {
            if (!accInfo || !loopringWalletResolver || !token || !selectedActivationAsset)
                return

            await loopringWalletResolver.resolver({ chainId: LoopringAPI.CHAIN, })

            const exchangeApi: lp.ExchangeAPI = new lp.ExchangeAPI({ chainId: LoopringAPI.CHAIN, });
            const { exchangeInfo } = await exchangeApi.getExchangeInfo();


            const eddsaKeyData = await generateActivateKeyPair(accInfo, connectProvides.usedWeb3 as any, fromAddress as `0x${string}`);
            const fee = await LoopringAPI.globalAPI.getActiveFeeInfo({
                accountId: accInfo.accountId,
            });
            const { eddsaKey, keySeed } = eddsaKeyData
            const publicKey = { x: eddsaKey.formatedPx, y: eddsaKey.formatedPy }

            await LoopringAPI.userAPI.updateAccount({
                request: {
                    exchange: exchangeInfo.exchangeAddress,
                    owner: accInfo.owner,
                    accountId: accInfo.accountId,
                    publicKey,
                    maxFee: {
                        tokenId: TOKEN_INFO.tokenMap[selectedActivationAsset]?.tokenId,
                        volume: fee.fees[selectedActivationAsset]?.fee,
                    },
                    keySeed,
                    validUntil: Math.round(Date.now() / 1000) + 30 * 86400,
                    nonce: accInfo.nonce as number,
                },
                web3: connectProvides.usedWeb3 as any,
                chainId: LoopringAPI.CHAIN,
                walletType: loopringWalletResolver.type,
                isHWAddr: false,
            });

            setActivationPubKey(publicKey)

            await refetchAccount()

            await LoopringAPI.userAPI.getUserApiKey({
                accountId: accInfo.accountId,
            }, eddsaKey.sk)

        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [source_currency, accInfo, loopringWalletResolver, selectedActivationAsset, refetchAccount])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const exchangeApi: lp.ExchangeAPI = new lp.ExchangeAPI({ chainId: LoopringAPI.CHAIN, });
            const { exchangeInfo } = await exchangeApi.getExchangeInfo();

            if (!swap || !accInfo || !unlockedAccount || !loopringWalletResolver)
                return

            const { apiKey, eddsaKey } = unlockedAccount

            const storageId = await LoopringAPI.userAPI.getNextStorageId(
                {
                    accountId: accInfo.accountId,
                    sellTokenId: Number(token?.contract_address),
                },
                apiKey);

            const fee = await LoopringAPI.userAPI.getOffchainFeeAmt({
                accountId: accInfo.accountId,
                requestType: lp.OffchainFeeReqType.TRANSFER,
            }, apiKey);

            const transferResult = await LoopringAPI.userAPI.submitInternalTransfer({
                request: {
                    exchange: exchangeInfo.exchangeAddress,
                    payerAddr: accInfo.owner,
                    payerId: accInfo.accountId,
                    payeeAddr: depositAddress as `0x${string}`,
                    payeeId: 0,
                    storageId: storageId.offchainId,
                    token: {
                        tokenId: Number(token?.contract_address),
                        volume: parseUnits(swap.requested_amount.toString(), Number(token?.decimals)).toString(),
                    },
                    maxFee: {
                        tokenId: Number(token?.contract_address),
                        volume: fee.fees[String(token?.asset)].fee,
                    },
                    validUntil: Math.round(Date.now() / 1000) + 30 * 86400,
                    memo: swap?.sequence_number.toString(),
                },
                web3: connectProvides.usedWeb3 as any,
                chainId: LoopringAPI.CHAIN,
                walletType: loopringWalletResolver?.type,
                apiKey,
                eddsaKey: eddsaKey.sk
            });
            debugger
            const txHash = (transferResult as any)?.hash
            const message = (transferResult as any)?.message
            if (txHash) {
                setSwapTransaction(swap.id, PublishedSwapTransactionStatus.Pending, txHash);
                setTransferDone(true)
            }
            else if (message) {
                toast(message)
            }
            else {
                throw new Error("Unexpected error")
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [swap, source_network, depositAddress, accInfo, unlockedAccount, token, loopringWalletResolver])

    if (noAccount) {
        //TODO fix text
        return <WalletMessage
            status="error"
            header='Account is not activated'
            details={`Make a deposit to your address for activating Loopring account`} />
    }

    if (accInfo?.frozen) {
        if (accInfo.publicKey.x === activationPubKey?.x
            && accInfo.publicKey.y === activationPubKey?.y) {
            return <WalletMessage
                status="pending"
                header='Your account is beeing activated'
                details={`You will be able to make transfers in 3-5 minutes.`} />
        }
        else {
            return <WalletMessage
                status="pending"
                header='Your account is frozen'
                details={`If you have just activated your account it will be unfrozen in couple of minutes.`} />
        }
    }

    if (!isConnected) {
        return <ConnectWalletButton />
    }

    if (source_network && chain?.id !== Number(source_network.chain_id)) {
        return (
            <ChangeNetworkButton
                chainId={Number(source_network?.chain_id)}
                network={source_network?.display_name}
            />
        )
    }

    const shouldActivate = accInfo && !(accInfo.publicKey.x
        || accInfo.publicKey.y)

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    {
                        (accInfo && unlockedAccount) ?
                            <SubmitButton isDisabled={!!(loading || transferDone)} isSubmitting={!!(loading || transferDone)} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                Send from wallet
                            </SubmitButton>
                            :
                            <>
                                {shouldActivate &&
                                    <div className="flex text-center mb-2 space-x-2">
                                        <div className="text-left space-y-1">
                                            <p className="text-md font-semibold self-center text-primary-text">
                                                Activate Loopring L2 Account
                                            </p>
                                            <p className="text-sm text-secondary-text break-allspace-x-1 ">
                                                <p className='flex mt-4 w-full justify-between items-center text-sm text-secondary-text'>
                                                    <span className='font-bold sm:inline hidden'>One time activation fee</span> <span className='font-bold sm:hidden'>Fee</span> <span className='text-primary-text text-sm sm:text-base flex items-center'>
                                                        <span className=' text-secondary-text text-sm ml-1'>
                                                            <span></span>
                                                            <ActivationTokenPicker
                                                                onChange={setSelectedActivationAsset}
                                                                accountId={accInfo.accountId}
                                                            />
                                                        </span>
                                                    </span>
                                                </p>
                                            </p>
                                        </div>
                                    </div>
                                }
                                <SubmitButton
                                    isDisabled={loadingAccount || !accInfo || loading}
                                    isSubmitting={loadingAccount || loading}
                                    onClick={shouldActivate ? activateAccout : unlockAccount}
                                    icon={shouldActivate ?
                                        <SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />
                                        : <Lock className="h-5 w-5 ml-2" aria-hidden="true" />
                                    }
                                >
                                    {shouldActivate ? <>Activate account</> : <>Unlock account</>}
                                </SubmitButton>
                            </>
                    }
                </div>
            </div>
        </>
    )
}




const resolveConnectProvedes = (connectorName: string): ConnectWalet | undefined =>
    ConnectProvedesMapping[connectorName]

const ConnectProvedesMapping = {
    "coinbasewallet": { resolver: connectProvides.Coinbase, type: ConnectorNames.Coinbase },
    "metamask": { resolver: connectProvides.MetaMask, type: ConnectorNames.MetaMask },
    "walletconnect": { resolver: connectProvides.WalletConnect, type: ConnectorNames.WalletConnect },
    "walletconnectv1": { resolver: connectProvides.WalletConnectV1, type: ConnectorNames.WalletConnect },
    "gamestop": { resolver: connectProvides.GameStop, type: ConnectorNames.Gamestop },
}

type ConnectWalet = {
    resolver: ({ chainId, ...props }: {
        darkMode?: boolean | undefined;
        chainId?: string | number | undefined;
    }) => Promise<void>,
    type: ConnectorNames
}


export default LoopringWalletWithdraw;

export let TOKEN_INFO = {
    addressIndex: {
        "0x0000000000000000000000000000000000000000": "ETH",
        "0xfc28028d9b1f6966fe74710653232972f50673be": "LRC",
        "0xd4e71c4bb48850f5971ce40aa428b09f242d3e8a": "USDT",
        "0xfeb069407df0e1e4b365c10992f1bc16c078e34b": "LP-LRC-ETH",
        "0x049a02fa9bc6bd54a2937e67d174cc69a9194f8e": "LP-ETH-USDT",
        "0xcd2c81b322a5b530b5fa3432e57da6803b0317f7": "DAI",
        "0x47525e6a5def04c9a56706e93f54cc70c2e8f165": "USDC",
        "0xf37cf4ced77b985708d591acc6bfd08586ab3409": "LP-USDC-ETH",
    },
    tokenMap: {
        ETH: {
            type: "ETH",
            tokenId: 0,
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            precision: 7,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "5000000000000000",
                maximum: "1000000000000000000000",
                dust: "200000000000000",
            },
            luckyTokenAmounts: {
                minimum: "50000000000000",
                maximum: "1000000000000000000000",
                dust: "50000000000000",
            },
            fastWithdrawLimit: "100000000000000000000",
            gasAmounts: {
                distribution: "85000",
                deposit: "100000",
            },
            enabled: true,
            isLpToken: false,
            tradePairs: ["LRC", "USDT", "USDC"],
        },
        LRC: {
            type: "erc20Trade",
            tokenId: 1,
            symbol: "LRC",
            name: "Loopring",
            address: "0xfc28028d9b1f6966fe74710653232972f50673be",
            decimals: 18,
            precision: 3,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "5000000000000000000",
                maximum: "5000000000000000000000000",
                dust: "5000000000000000000",
            },
            luckyTokenAmounts: {
                minimum: "50000000000000000",
                maximum: "5000000000000000000000000",
                dust: "50000000000000000",
            },
            fastWithdrawLimit: "750000000000000000000000",
            gasAmounts: {
                distribution: "101827",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: false,
            tradePairs: ["ETH"],
        },
        USDT: {
            type: "erc20Trade",
            tokenId: 2,
            symbol: "USDT",
            name: "USDT",
            address: "0xd4e71c4bb48850f5971ce40aa428b09f242d3e8a",
            decimals: 6,
            precision: 2,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "5000000",
                maximum: "2000000000000",
                dust: "250000",
            },
            luckyTokenAmounts: {
                minimum: "50000",
                maximum: "200000000000",
                dust: "50000",
            },
            fastWithdrawLimit: "250000000000",
            gasAmounts: {
                distribution: "106233",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: false,
            tradePairs: ["ETH", "DAI"],
        },
        "LP-LRC-ETH": {
            type: "erc20Trade",
            tokenId: 4,
            symbol: "LP-LRC-ETH",
            name: "AMM-LRC-ETH",
            address: "0xfeb069407df0e1e4b365c10992f1bc16c078e34b",
            decimals: 8,
            precision: 6,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "100000000",
                maximum: "10000000000000000000",
                dust: "100000000",
            },
            luckyTokenAmounts: {
                minimum: "100000000",
                maximum: "10000000000000000000",
                dust: "100000000",
            },
            fastWithdrawLimit: "20000000000",
            gasAmounts: {
                distribution: "150000",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: true,
        },
        "LP-ETH-USDT": {
            type: "erc20Trade",
            tokenId: 7,
            symbol: "LP-ETH-USDT",
            name: "LP-ETH-USDT",
            address: "0x049a02fa9bc6bd54a2937e67d174cc69a9194f8e",
            decimals: 8,
            precision: 6,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "100000000",
                maximum: "10000000000000",
                dust: "100000000",
            },
            luckyTokenAmounts: {
                minimum: "100000000",
                maximum: "10000000000000",
                dust: "100000000",
            },
            fastWithdrawLimit: "20000000000",
            gasAmounts: {
                distribution: "150000",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: true,
        },
        DAI: {
            type: "erc20Trade",
            tokenId: 6,
            symbol: "DAI",
            name: "dai",
            address: "0xcd2c81b322a5b530b5fa3432e57da6803b0317f7",
            decimals: 18,
            precision: 6,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "10000000000000000000",
                maximum: "100000000000000000000000",
                dust: "10000000000000000",
            },
            luckyTokenAmounts: {
                minimum: "10000000000000000000",
                maximum: "100000000000000000000000",
                dust: "10000000000000000000",
            },
            fastWithdrawLimit: "10000000000000000000000",
            gasAmounts: {
                distribution: "150000",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: false,
            tradePairs: ["USDT"],
        },
        USDC: {
            type: "USDC",
            tokenId: 8,
            symbol: "USDC",
            name: "USDC",
            address: "0x47525e6a5def04c9a56706e93f54cc70c2e8f165",
            decimals: 6,
            precision: 6,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "1000",
                maximum: "10000000000000000000",
                dust: "100",
            },
            luckyTokenAmounts: {
                minimum: "1000000",
                maximum: "10000000000",
                dust: "1000000",
            },
            fastWithdrawLimit: "20000000000000000000",
            gasAmounts: {
                distribution: "150000",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: false,
            tradePairs: ["ETH"],
        },
        "LP-USDC-ETH": {
            type: "LP-USDC-ETH",
            tokenId: 9,
            symbol: "LP-USDC-ETH",
            name: "LP-USDC-ETH",
            address: "0xf37cf4ced77b985708d591acc6bfd08586ab3409",
            decimals: 8,
            precision: 7,
            precisionForOrder: 3,
            orderAmounts: {
                minimum: "100000",
                maximum: "1000000000000000000000000000000000000000",
                dust: "10000",
            },
            luckyTokenAmounts: {
                minimum: "1000000000000000",
                maximum: "10000000000000000000",
                dust: "1000000000000000",
            },
            fastWithdrawLimit: "20000000000000000000",
            gasAmounts: {
                distribution: "150000",
                deposit: "200000",
            },
            enabled: true,
            isLpToken: true,
        },
    },
    idIndex: {
        "0": "ETH",
        "1": "LRC",
        "2": "USDT",
        "4": "LP-LRC-ETH",
        "6": "DAI",
        "7": "LP-ETH-USDT",
        "8": "USDC",
        "9": "LP-USDC-ETH",
    },
    marketMap: {
        "LRC-ETH": {
            baseTokenId: 1,
            enabled: true,
            market: "LRC-ETH",
            orderbookAggLevels: 5,
            precisionForPrice: 6,
            quoteTokenId: 0,
            status: 3,
            isSwapEnabled: true,
            createdAt: 1617967800000,
        },
        "ETH-USDT": {
            baseTokenId: 0,
            enabled: true,
            market: "ETH-USDT",
            orderbookAggLevels: 3,
            precisionForPrice: 3,
            quoteTokenId: 2,
            status: 3,
            isSwapEnabled: true,
            createdAt: 1617972300000,
        },
        "DAI-USDT": {
            baseTokenId: 6,
            enabled: true,
            market: "DAI-USDT",
            orderbookAggLevels: 2,
            precisionForPrice: 4,
            quoteTokenId: 2,
            status: 3,
            isSwapEnabled: true,
            createdAt: 0,
        },
        "USDC-ETH": {
            baseTokenId: 8,
            enabled: true,
            market: "USDC-ETH",
            orderbookAggLevels: 3,
            precisionForPrice: 3,
            quoteTokenId: 0,
            status: 3,
            isSwapEnabled: true,
            createdAt: 1636974420000,
        },
    },
};