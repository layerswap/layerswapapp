import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import * as zksync from 'zksync';
import { utils } from 'ethers';
import { useEthersSigner } from '../../../../lib/ethersToViem/ethers';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import { PublishedSwapTransactionStatus, PublishedSwapTransactions } from '../../../../lib/layerSwapApiClient';
import { useSwapDataState } from '../../../../context/swap';
import { ChangeNetworkButton, ConnectWalletButton } from './WalletTransfer/buttons';
import { useSettingsState } from '../../../../context/settings';
import { useNetwork } from 'wagmi';
import { Transaction } from 'zksync';
import FailIcon from '../../../icons/FailIcon';

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

    const { setSwapTransaction } = useSwapTransactionStore();
    const { swap } = useSwapDataState();
    const signer = useEthersSigner();
    const { chain } = useNetwork();

    const { networks, layers } = useSettingsState();
    const { source_network: source_network_internal_name } = swap || {};
    const source_network = networks.find(n => n.internal_name === source_network_internal_name);
    const source_layer = layers.find(l => l.internal_name === source_network_internal_name)
    const source_currency = source_network?.currencies?.find(c => c.asset.toLocaleUpperCase() === swap?.source_network_asset.toLocaleUpperCase());
    const defaultProvider = swap?.source_network?.split('_')?.[1]?.toLowerCase() == "mainnet" ? "mainnet" : "goerli";
    const l1Network = networks.find(n => n.internal_name === source_network?.metadata?.L1Network);

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
                return
            }
            const changePubkeyHandle = await syncWallet.setSigningKey({ ethAuthType: "ECDSALegacyMessage", feeToken: Number(source_currency?.contract_address) });
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
        setLoading(false)

    }, [syncWallet, swap, depositAddress, source_currency, amount])

    if (!signer) {
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
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleAuthorize} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Authorize to Send on zkSync
                        </SubmitButton>
                    }
                    {
                        syncWallet && !accountIsActivated &&
                        <>
                            <div className="flex text-center mb-2 space-x-2">
                                {/* here may be some icon */}
                                {/* <div className='relative'>
                                    <FailIcon className="relative top-0 left-0 w-6 h-6 md:w-7 md:h-7" />
                                </div> */}
                                <div className="text-left space-y-1">
                                    <p className="text-md font-semibold self-center text-primary-text">
                                        Bla bla header
                                    </p>
                                    <p className="text-sm text-secondary-text break-all">
                                        jiga juga thing explained in details
                                    </p>
                                </div>
                            </div>
                            <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={activateAccout} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                Activate account
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