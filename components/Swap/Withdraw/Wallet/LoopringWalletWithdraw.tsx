import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState } from '../../../../context/swap';
import toast from 'react-hot-toast';
import { useSettingsState } from '../../../../context/settings';
import { useWalletState, useWalletUpdate } from '../../../../context/wallet';
import { useAccount } from 'wagmi';
import { LoopringAPI } from '../../../../lib/loopring/LoopringAPI';
import { ConnectorNames } from '@loopring-web/loopring-sdk';
import { connectProvides } from '@loopring-web/web3-provider';
import { ConnectWalletButton } from './WalletTransfer/buttons';
import * as lp from "@loopring-web/loopring-sdk";
import { signatureKeyPairMock } from '../../../../lib/loopring/helpers';
import { useWeb3Signer } from '../../../../lib/toViem/toWeb3';
import { parseUnits } from 'viem';
import WalletMessage from './WalletTransfer/message';

type Props = {
    depositAddress: string,
    amount: number
}

const LoopringWalletWithdraw: FC<Props> = ({ depositAddress, amount }) => {
    const [loading, setLoading] = useState(false);
    const [transferDone, setTransferDone] = useState<boolean>();
    //const [inactive, setInactive] = useState(false);
    const { lprAccount } = useWalletState();
    const { swap } = useSwapDataState();
    const { networks } = useSettingsState();
    const { isConnected, address: fromAddress } = useAccount();

    const { setLprAccount } = useWalletUpdate();

    const web3 = useWeb3Signer();
    const { source_network: source_network_internal_name } = swap;
    const source_network = networks.find(n => n.internal_name === source_network_internal_name);
    const token = networks.find(n => swap.source_network == n.internal_name).currencies.find(c => c.asset == swap.source_network_asset);

    const { layers } = useSettingsState();
    const sourceNnetwork = layers.find(n => n.internal_name === source_network_internal_name);
    const decimals = sourceNnetwork.assets.find(c => c.asset.toLowerCase() === swap.source_network_asset.toLowerCase()).decimals;

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            debugger
            const account = await LoopringAPI.exchangeAPI.getAccount({
                owner: fromAddress,
            })

            // if ((account as any).code == 101002) {
            //     setInactive(true);
            //     return
            // }

            const response = await LoopringAPI.userAPI.unLockAccount(
                {
                    keyPair: {
                        web3,
                        address: account?.accInfo?.owner,
                        keySeed: account.accInfo.keySeed,
                        walletType: ConnectorNames.MetaMask,
                        chainId: 1,
                        accountId: Number(account.accInfo.accountId),
                    },
                    request: {
                        accountId: account.accInfo.accountId,
                    },
                },
                account.accInfo.publicKey
            );
            setLprAccount(account?.accInfo?.owner)
            const res = await connectProvides.MetaMask({ chainId: 1 })
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [source_network, fromAddress, web3])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const exchangeApi: lp.ExchangeAPI = new lp.ExchangeAPI({ chainId: 1 });
            const { exchangeInfo } = await exchangeApi.getExchangeInfo();

            const { accInfo } = await LoopringAPI.exchangeAPI.getAccount({
                owner: fromAddress,
            });

            if (!accInfo) {
                return { errorMsg: "AccountInfo Does not exists", result: null };
            }

            if (accInfo.keySeed == "") {
                return { errorMsg: "AccountInfo Does not contain keyseed. Might need to Reset Loopring L2 Keypair", result: null };
            }

            const eddsaKey = await signatureKeyPairMock(accInfo, web3, fromAddress);
            const { apiKey } = await LoopringAPI.userAPI.getUserApiKey(
                {
                    accountId: accInfo.accountId,
                },
                eddsaKey.sk
            );

            const storageId = await LoopringAPI.userAPI.getNextStorageId(
                {
                    accountId: accInfo.accountId,
                    sellTokenId: Number(token.contract_address),
                },
                apiKey
            );

            const fee = await LoopringAPI.userAPI.getOffchainFeeAmt({
                accountId: accInfo.accountId,
                requestType: lp.OffchainFeeReqType.TRANSFER,
            }, apiKey);

            const transferResult = await LoopringAPI.userAPI.submitInternalTransfer({
                request: {
                    exchange: exchangeInfo.exchangeAddress,
                    payerAddr: accInfo.owner,
                    payerId: accInfo.accountId,
                    payeeAddr: depositAddress,
                    payeeId: 0,
                    storageId: storageId.offchainId,
                    token: {
                        tokenId: token.contract_address,
                        volume: parseUnits(swap.requested_amount.toString(), decimals).toString(),
                    },
                    maxFee: {
                        tokenId: token.contract_address,
                        volume: fee.fees[token.asset].fee ?? "9400000000000000000",
                    },
                    validUntil: Math.round(Date.now() / 1000) + 30 * 86400,
                },
                web3: connectProvides.usedWeb3 as any,
                chainId: 1,
                walletType: ConnectorNames.MetaMask,
                apiKey,
                eddsaKey: eddsaKey.sk
            });
            setTransferDone(true);
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [swap, source_network, web3, depositAddress])

    if (!isConnected) {
        return <ConnectWalletButton />
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    {/* {
                        inactive &&
                        <WalletMessage
                            status="error"
                            header='Activate your Loopring account'
                            details={`Make a deposit to your address for activating Loopring account`} />
                    } */}
                    {
                        !lprAccount &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Unlock
                        </SubmitButton>
                    }
                    {
                        lprAccount &&
                        <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}


export default LoopringWalletWithdraw;