import { AlertTriangle, ArrowLeftRight, Info } from 'lucide-react';
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import * as zksync from 'zksync';
import { utils } from 'ethers';
import { useEthersSigner } from '../../../../lib/ethersToViem/ethers';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSwapDataState } from '../../../../context/swap';
import { ChangeNetworkButton, ConnectWalletButton } from './WalletTransfer/buttons';
import { useSettingsState } from '../../../../context/settings';
import { useAccount, useNetwork } from 'wagmi';
import { Transaction } from 'zksync';
import ClickTooltip from '../../../Tooltips/ClickTooltip';
import SignatureIcon from '../../../icons/SignatureIcon';
import formatAmount from '../../../../lib/formatAmount';
import useWallet from '../../../../hooks/useWallet';
import Link from 'next/link';

type Props = {
    depositAddress: string,
    amount: number
}

const ZkSyncWalletWithdrawStep: FC<Props> = ({ depositAddress, amount }) => {
    const [loading, setLoading] = useState(false);
    const [transferDone, setTransferDone] = useState<boolean>();
    const [syncWallet, setSyncWallet] = useState<zksync.Wallet | null>();
    const [syncTransfer, setSyncTransfer] = useState<Transaction>();
    const [txHash, setTxHash] = useState('');
    const [accountIsActivated, setAccountIsActivated] = useState(false);
    const [activationFee, setActivationFee] = useState<({ feeInAsset: number, feeInUsd: number } | undefined)>(undefined);

    const { setSwapTransaction } = useSwapTransactionStore();
    const { swap } = useSwapDataState();
    const { chain } = useNetwork();
    const signer = useEthersSigner();

    const { layers } = useSettingsState();
    const { source_network: source_network_internal_name } = swap || {};
    const source_network = layers.find(n => n.internal_name === source_network_internal_name);
    const source_layer = layers.find(l => l.internal_name === source_network_internal_name)
    const source_currency = source_network?.assets?.find(c => c.asset.toLocaleUpperCase() === swap?.source_network_asset.toLocaleUpperCase());
    const defaultProvider = swap?.source_network?.split('_')?.[1]?.toLowerCase() == "mainnet" ? "mainnet" : "goerli";
    const l1Network = layers.find(n => n.internal_name === source_network?.metadata?.L1Network);

    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

    useEffect(() => {
        if (signer?._address !== syncWallet?.cachedAddress && source_layer) {
            setSyncWallet(null)
        }
    }, [signer?._address]);

    useEffect(() => {
        const getTxReceipt = async () => {
            const syncProvider = await zksync.getDefaultProvider(defaultProvider);
            const txReceipt = await syncProvider.getTxReceipt(String(syncTransfer?.txHash));
            // TODO: might be unnecessary why handleTransaction does not do this
            if (swap?.id) {
                if (txReceipt.executed && !txReceipt.success) {
                    setSwapTransaction(swap?.id, PublishedSwapTransactionStatus.Error, txHash, txReceipt?.failReason);
                    toast(String(txReceipt.failReason))
                    setLoading(false)
                } else if (txReceipt.executed && txReceipt.success) {
                    setSwapTransaction(swap?.id, PublishedSwapTransactionStatus.Completed, txHash);
                    setTransferDone(true);
                } else {
                    setSwapTransaction(swap?.id, PublishedSwapTransactionStatus.Pending, txHash);
                }
            }
        };
        if (txHash)
            getTxReceipt();
    }, [syncTransfer, swap, txHash]);

    const handleAuthorize = useCallback(async () => {
        if (!signer)
            return
        setLoading(true)
        try {
            const syncProvider = await zksync.getDefaultProvider(defaultProvider);
            const wallet = await zksync.Wallet.fromEthSigner(signer, syncProvider);
            setAccountIsActivated(await wallet.isSigningKeySet())
            if (!accountIsActivated) {
                let activationFee = await syncProvider.getTransactionFee({
                    ChangePubKey: 'ECDSA'
                }, wallet.address(), Number(source_currency?.contract_address));
                const formatedGas = formatAmount(activationFee.totalFee, Number(source_currency?.decimals))
                let assetUsdPrice = source_layer?.assets.find(x => x.asset == source_currency?.asset)?.usd_price;
                setActivationFee({ feeInAsset: formatedGas, feeInUsd: formatedGas * (assetUsdPrice ?? 0) })
            }
            setSyncWallet(wallet)
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [signer, defaultProvider, source_currency])

    const activateAccout = useCallback(async () => {
        if (!syncWallet)
            return
        setLoading(true)
        try {
            if (await syncWallet.isSigningKeySet()) {
                setAccountIsActivated(true)
                setLoading(false);
                return
            }
            const changePubkeyHandle = await syncWallet.setSigningKey({ ethAuthType: "ECDSA", feeToken: Number(source_currency?.contract_address) });
            const receipt = await changePubkeyHandle.awaitReceipt()
            if (receipt.success)
                setAccountIsActivated(true)
            else if (receipt.failReason)
                toast(receipt.failReason)

            else
                toast("Activation failed")
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [syncWallet, source_currency])

    const handleTransfer = useCallback(async () => {

        if (!swap || !syncWallet) return

        setLoading(true)
        try {
            const tf = await syncWallet?.syncTransfer({
                to: depositAddress,
                token: swap?.source_network_asset,
                amount: zksync.closestPackableTransactionAmount(utils.parseUnits(amount.toString(), source_currency?.decimals)),
                validUntil: zksync.utils.MAX_TIMESTAMP - swap?.sequence_number,
            });

            if (tf?.txHash) {
                setTxHash(tf?.txHash?.replace('sync-tx:', ''))
                setSyncTransfer(tf);
            }
        }
        catch (e) {
            if (e?.message) {
                toast(e.message)
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [syncWallet, swap, depositAddress, source_currency, amount])

    if (wallet && wallet?.connector?.toLowerCase() !== 'metamask') return (
        <div className="rounded-md bg-secondary-800 p-4">
            <div className="flex">
                <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-primary-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary-text">Please switch to manually</h3>
                    <div className="mt-2 text-sm text-secondary-text">
                        <p><span>Automatic transfers from Argent zkSync Lite wallet are not supported now. Choose the manual transfer option and follow the</span> <Link target="_blank" className="underline hover:no-underline cursor-pointer hover:text-secondary-text text-primary-text font-light" href='https://www.youtube.com/watch?v=u_KzSr5v8M8&ab_channel=Layerswap'>tutorial</Link> <span>for a smooth swap.</span></p>
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
                network={l1Network?.display_name}
            />
        )
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>

                    {
                        !syncWallet &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleAuthorize} icon={<SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Authorize to Send on zkSync
                        </SubmitButton>
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
                                                        <p>You can learn more about account activation and the associated fee</p>
                                                    </span>
                                                </span>
                                                <a target='_blank' className='text-primary underline hover:no-underline decoration-primary cursor-pointer' href="https://docs.zksync.io/userdocs/faq/#what-is-the-account-activation-fee">in the zkSync Lite FAQ</a>
                                            </p>
                                        } />
                                </p>
                                <p className="text-sm text-primary-text break-normal">
                                    Sign a message to activate your zkSync Lite account.
                                </p>
                                <p className='flex mt-4 w-full justify-between items-center text-sm text-secondary-text'><span className='font-bold sm:inline hidden'>One time activation fee</span> <span className='font-bold sm:hidden'>Fee</span> <span className='text-primary-text text-sm sm:text-base flex items-center'>{activationFee?.feeInAsset}{source_currency?.asset}<span className='text-secondary-text text-sm'>({activationFee?.feeInUsd.toFixed(2)}$)</span></span></p>
                            </div>
                            <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={activateAccout} icon={<SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                Sign to activate
                            </SubmitButton>
                        </>
                    }
                    {
                        syncWallet && accountIsActivated &&
                        <SubmitButton isDisabled={!!(loading || transferDone)} isSubmitting={!!(loading || transferDone)} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}
export default ZkSyncWalletWithdrawStep;