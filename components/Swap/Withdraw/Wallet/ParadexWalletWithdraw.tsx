import { ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useMemo, useState } from 'react'
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from './WalletTransfer/buttons';
import useWallet from '../../../../hooks/useWallet';
import { WithdrawPageProps } from './WalletTransferContent';
import * as Paradex from "@paradex/sdk";
import { TypedData } from '@paradex/sdk/dist/ethereum-signer';
import { useNetwork } from 'wagmi';
import { useSettingsState } from '../../../../context/settings';
import KnownInternalNames from '../../../../lib/knownIds';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useEthersSigner } from '../../../../lib/ethersToViem/ethers';

const ParadexWalletWithdrawStep: FC<WithdrawPageProps> = ({ amount, network, token, callData, swapId }) => {

    const [loading, setLoading] = useState(false)

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);

    const { setSwapTransaction } = useSwapTransactionStore();

    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return l1Network && getProvider(l1Network)
    }, [l1Network, getProvider])
    const { chain } = useNetwork();

    const wallet = provider?.getConnectedWallet()

    const ethersSigner = useEthersSigner()

    const handleAuthorize = useCallback(async () => {

        if (!ethersSigner) return

        try {

            const environment = process.env.NEXT_PUBLIC_API_VERSION === 'prod' ? 'prod' : 'testnet'
            const config = await Paradex.Config.fetchConfig(environment);

            const paraclearProvider = new Paradex.ParaclearProvider.DefaultProvider(config);

            function ethersSignerAdapter(signer: typeof ethersSigner) {
                return {
                    async signTypedData(typedData: TypedData) {
                        return await signer!._signTypedData(typedData.domain, typedData.types, typedData.message);
                    },
                };
            }
            const signer = ethersSignerAdapter(ethersSigner);

            if (!signer) throw new Error('Signer not found');

            const account = await Paradex.Account.fromEthSigner({
                provider: paraclearProvider,
                config,
                signer: signer,
            });

            return account
        } catch (e) {
            debugger
            throw new Error(e)
        }

    }, [Paradex, setLoading, ethersSigner])

    const handleTransfer = async () => {
        if (!token || !amount || !callData || !swapId) return
        setLoading(true)

        try {
            const account = await handleAuthorize()

            if (!account) throw new Error('Account not found')

            const res = await account.execute(JSON.parse(callData || ""), undefined, { maxFee: '1000000000000000' });

            if (res.transaction_hash) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, res.transaction_hash);
            }
        } catch (e) {
            throw new Error(e)
        } finally {
            setLoading(false)
        }
    }

    if (!wallet) {
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
        <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
            <div className='space-y-4'>
                <ButtonWrapper isDisabled={!!(loading)} isSubmitting={!!loading} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                    Send from wallet
                </ButtonWrapper>
            </div>
        </div>
    )
}
export default ParadexWalletWithdrawStep;