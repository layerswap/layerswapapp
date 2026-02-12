"use client";
import { ArrowLeftRight, Info } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import { utils } from 'ethers';
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton, SendTransactionButton, useSettingsState, KnownInternalNames, useSelectedAccount, useWallet, SignatureIcon, ClickTooltip, ActionMessage, ErrorHandler } from '@layerswap/widget/internal';
import { useAccount } from 'wagmi';
import { TransferProps, ActionMessageType, WithdrawPageProps } from '@layerswap/widget/types';
import { formatUnits } from 'viem';
import { useEthersSigner } from './utils/ethers';

// Type definitions for zksync
type ZkSyncWallet = {
    cachedAddress: string;
    isSigningKeySet(): Promise<boolean>;
    setSigningKey(params: { ethAuthType: string; feeToken: number }): Promise<any>;
    address(): string;
    syncTransfer(params: {
        to: string;
        token: string;
        amount: any;
        validUntil: number;
    }): Promise<{ txHash?: string }>;
};

type ZkSyncProvider = {
    getTransactionFee(params: { ChangePubKey: string }, address: string, tokenId: number): Promise<{ totalFee: { toString(): string } }>;
};

type ZkSyncModule = {
    getDefaultProvider(provider: string): Promise<ZkSyncProvider>;
    Wallet: {
        fromEthSigner(signer: any, provider: ZkSyncProvider): Promise<ZkSyncWallet>;
    };
    closestPackableTransactionAmount(amount: any): any;
    utils: {
        MAX_TIMESTAMP: number;
    };
};

const ZkSyncMultiStepHandler: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<Error | undefined>()
    const [syncWallet, setSyncWallet] = useState<ZkSyncWallet | null>();
    const [accountIsActivated, setAccountIsActivated] = useState(false);
    const [activationFee, setActivationFee] = useState<({ feeInAsset: number, feeInUsd: number } | undefined)>(undefined);
    const { source_network, source_token } = swapBasicData;
    const { chain } = useAccount();
    const signer = useEthersSigner();

    const { networks: layers } = useSettingsState();
    const defaultProvider = source_network?.name?.split('_')?.[1]?.toLowerCase() == "mainnet" ? "mainnet" : "goerli";
    const l1Network = layers.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
    const { wallets } = useWallet(source_network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)

    useEffect(() => {
        if (signer?._address !== syncWallet?.cachedAddress && source_network) {
            setSyncWallet(null)
        }
    }, [signer?._address]);

    const handleAuthorize = useCallback(async () => {
        if (!signer)
            return
        setLoading(true)
        setButtonClicked(true)
        setError(undefined)
        try {
            const zksync = await import('zksync') as ZkSyncModule;
            const syncProvider = await zksync.getDefaultProvider(defaultProvider);
            const wallet = await zksync.Wallet.fromEthSigner(signer, syncProvider);
            setAccountIsActivated(await wallet.isSigningKeySet())
            if (!accountIsActivated) {
                let activationFee = await syncProvider.getTransactionFee({
                    ChangePubKey: 'ECDSA'
                }, wallet.address(), Number(source_token?.contract));
                const formatedGas = Number(formatUnits(BigInt(activationFee.totalFee.toString()), Number(source_token?.decimals)))
                let assetUsdPrice = source_token?.price_in_usd;
                setActivationFee({ feeInAsset: formatedGas, feeInUsd: formatedGas * (assetUsdPrice ?? 0) })
            }
            setSyncWallet(wallet)
        }
        catch (error) {
            (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setError(error as Error)
            ErrorHandler({
                type: "WalletError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
        finally {
            setLoading(false)
        }
    }, [signer, defaultProvider, source_token])

    const activateAccout = useCallback(async () => {

        if (!syncWallet)
            return
        setLoading(true)
        setButtonClicked(true)
        setError(undefined)
        try {
            if (await syncWallet.isSigningKeySet()) {
                setAccountIsActivated(true)
                setLoading(false);
                return
            }
            const changePubkeyHandle = await syncWallet.setSigningKey({ ethAuthType: "ECDSA", feeToken: Number(source_token?.contract) });
            const receipt = await changePubkeyHandle.awaitReceipt()
            if (receipt.success)
                setAccountIsActivated(true)
            else if (receipt.failReason)
                throw new Error(receipt.failReason)

            else
                throw new Error("Activation failed")
        }
        catch (error) {
            (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setError(error as Error)
            ErrorHandler({
                type: "WalletError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
        finally {
            setLoading(false)
        }
    }, [syncWallet, source_token])

    const handleTransfer = useCallback(async ({ amount, depositAddress, sequenceNumber, swapId }: TransferProps) => {

        if (!swapId || !syncWallet || !depositAddress || !source_token || !sequenceNumber || !amount) return

        setLoading(true)
        setButtonClicked(true)
        setError(undefined)
        try {
            const zksync = await import('zksync') as ZkSyncModule;
            const tf = await syncWallet?.syncTransfer({
                to: depositAddress,
                token: source_token.symbol,
                amount: zksync.closestPackableTransactionAmount(utils.parseUnits(amount.toString(), source_token?.decimals)),
                validUntil: zksync.utils.MAX_TIMESTAMP - sequenceNumber,
            });

            if (tf?.txHash) {
                const txHash = tf?.txHash?.replace('sync-tx:', '0x');
                return txHash;
            }
        }
        catch (error) {
            (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setLoading(false)
            setError(error as Error)
            ErrorHandler({
                type: "TransferError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
    }, [syncWallet, source_token])

    if (wallet && wallet?.id?.toLowerCase() === 'argent') return (
        <div className="rounded-md bg-secondary-800 p-4">
            <div className="flex">
                <div className="shrink-0">
                    <Info className="h-5 w-5 text-primary-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary-text">Please switch to manually</h3>
                    <div className="mt-2 text-sm text-secondary-text">
                        <p><span>Automatic transfers from Argent zkSync Lite wallet are not supported now. Choose the manual transfer option and follow the</span> <a target="_blank" className="underline hover:no-underline cursor-pointer hover:text-secondary-text text-primary-text font-light" href='https://www.youtube.com/watch?v=u_KzSr5v8M8&ab_channel=Layerswap' rel="noopener noreferrer">tutorial</a> <span>for a smooth swap.</span></p>
                    </div>
                </div>
            </div>
        </div>
    )

    if (!signer || !wallet) {
        return <ConnectWalletButton />
    }

    if (l1Network && chain?.id !== Number(l1Network.chain_id)) {
        return (
            <ChangeNetworkButton
                chainId={Number(l1Network?.chain_id)}
                network={l1Network}
            />
        )
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    {
                        buttonClicked &&
                        <ActionMessage
                            error={error}
                            isLoading={loading}
                            selectedSourceAddress={selectedSourceAccount?.address || ''}
                            sourceNetwork={source_network}
                        />
                    }
                    {
                        !syncWallet &&
                        <ButtonWrapper isDisabled={loading} isSubmitting={loading} onClick={handleAuthorize} icon={<SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Authorize to Send on zkSync
                        </ButtonWrapper>
                    }
                    {
                        syncWallet && !accountIsActivated &&
                        <>
                            <div className="w-full">
                                <p className="text-base items-center flex font-semibold self-center text-primary-text">
                                    <span>Account Activation</span>
                                    <ClickTooltip moreClassNames='text-secondary-text'
                                        text={
                                            <p>
                                                <span>
                                                    <span>The connected address is not </span>
                                                    <span className='italic'>active</span>
                                                    <span><span> in the zkSync Lite network.</span>
                                                        <span>You can learn more about account activation and the associated fee</span>
                                                    </span>
                                                </span>
                                                <a target='_blank' className='text-primary underline hover:no-underline decoration-primary cursor-pointer' href="https://docs.zksync.io/userdocs/faq/#what-is-the-account-activation-fee/">in the zkSync Lite FAQ</a>
                                            </p>
                                        } />
                                </p>
                                <p className="text-sm text-primary-text break-normal">
                                    Sign a message to activate your zkSync Lite account.
                                </p>
                                <p className='flex mt-4 w-full justify-between items-center text-sm text-secondary-text'><span className='font-bold sm:inline hidden'>One time activation fee</span> <span className='font-bold sm:hidden'>Fee</span> <span className='text-primary-text text-sm sm:text-base flex items-center'>{activationFee?.feeInAsset}{source_token?.symbol}<span className='text-secondary-text text-sm'>({activationFee?.feeInUsd.toFixed(2)}$)</span></span></p>
                            </div>
                            <ButtonWrapper isDisabled={loading} isSubmitting={loading} onClick={activateAccout} icon={<SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                Sign to activate
                            </ButtonWrapper>
                        </>
                    }
                    {
                        syncWallet && accountIsActivated &&
                        <SendTransactionButton
                            isDisabled={!!(loading)}
                            isSubmitting={!!loading}
                            onClick={handleTransfer}
                            icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />}
                            swapData={swapBasicData}
                            refuel={refuel}
                        />
                    }
                </div>
            </div>
        </>
    )
}

export default ZkSyncMultiStepHandler