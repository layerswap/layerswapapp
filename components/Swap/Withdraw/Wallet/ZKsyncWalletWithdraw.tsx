import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import { useWalletState, useWalletUpdate } from '../../../../context/wallet';
import * as zksync from 'zksync';
import { ethers } from 'ethers';
import { useEthersSigner } from '../../../../lib/ethersToViem/ethers';

type Props = {
    depositAddress: string
}

const ZkSyncWalletWithdrawStep: FC<Props> = ({ depositAddress }) => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { zkSyncAccount } = useWalletState()
    const { setZkSyncAccount } = useWalletUpdate()
    let syncWallet:zksync.Wallet;
    const signer = useEthersSigner()

    const handleConnect = async () => {
        setLoading(true)
        try {
            const syncProvider = await zksync.getDefaultProvider('mainnet');
            syncWallet = await zksync.Wallet.fromEthSigner(signer, syncProvider);
            setZkSyncAccount(syncWallet.cachedAddress);
            console.log(syncWallet)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }

    const handleTransfer = async () => {
        setLoading(true)
        console.log(syncWallet)
        try {
            const syncProvider = await zksync.getDefaultProvider('mainnet');
            const syncWallet = await zksync.Wallet.fromEthSigner(signer, syncProvider);
            setZkSyncAccount(syncWallet.cachedAddress);
            const transfer = await syncWallet.syncTransfer({
                to: depositAddress,
                token: 'ETH',
                amount: ethers.utils.parseEther('0.0000002')
            });

            const depositReceipt = await transfer.awaitReceipt();
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    {/* <WarningMessage messageType='informing'>
                        <span className='flex-none'>
                            Learn how to send from
                        </span>
                        <GuideLink text={source_network?.display_name} userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/off-ramp/send-assets-from-immutablex' />
                    </WarningMessage> */}

                    {
                        <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}


export default ZkSyncWalletWithdrawStep;