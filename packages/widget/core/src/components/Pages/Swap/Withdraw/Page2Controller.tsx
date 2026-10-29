import type { AdjustWithdrawalAmount } from '../Form/SwapFormValues';
import { WalletTransferView } from './Presentation/Page2Sections';
import type { ReactNode } from 'react';
import type { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import type { WalletWithdrawal } from '@layerswap/widget-types';
import { useWithdrawalProvider } from '@/hooks/useWithdrawalProvider';
import { WithdrawalProvider } from '@/context/withdrawalContext';
import { useSwapDataState } from '@/context/swap';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import useWallet from '@/hooks/useWallet';
import { useSelectedAccount } from '@/context/swapAccounts';
import { useEffect } from 'react';
import { useWithdrawBalance } from './Withdraw';
import { useWalletWithdrawalController } from './Wallet';
import { useManualWithdrawController } from './ManualWithdraw';
import { useProviderWithdrawal } from './WithdrawalProviders/useProviderWithdrawal';
import { ProviderWithdrawalControls } from './WithdrawalProviders/ProviderWalletWithdrawal';
import { useConnectWalletController } from './Wallet/Common/buttons';
import { ConnectWalletView } from './Presentation/WalletActionsView';
import type { WalletProgressData } from './Presentation/walletProgress';
import type { Partner } from '@/Models';

type Model = {
    controls: ReactNode | null;
    footer?: ReactNode | null;
    actionKey?: string;
    walletProgress?: WalletProgressData;
};
type Props = {
    swapBasicData: SwapBasicData;
    type: 'widget' | 'contained';
    partner?: Partner;
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
    onAdjustAmount?: AdjustWithdrawalAmount;
    children: (model: Model) => ReactNode;
};

export function Page2Controller(props: Props) {
    const source = props.swapBasicData.source_network;
    const definition = useWithdrawalProvider(source);
    return (
        <WithdrawalProvider
            onWalletWithdrawalSuccess={props.onWalletWithdrawalSuccess}
            onCancelWithdrawal={props.onCancelWithdrawal}
            showProgress={false}
        >
            {props.swapBasicData.use_deposit_address ? <ManualController {...props} />
                : definition ? <ProviderController key={definition.id} {...props} definition={definition} />
                : <WalletController {...props} />}
        </WithdrawalProvider>
    );
}

function WalletController(props: Props) {
    const { swapDetails, refuel } = useSwapDataState();
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const balance = useWithdrawBalance(active, props.onAdjustAmount);
    const { provider, wallets } = useWallet(
        props.swapBasicData.source_network,
        'withdrawal',
    );
    const account = useSelectedAccount(
        'from',
        props.swapBasicData.source_network.name,
    );
    useEffect(() => {
        if (!active || !account) return;
        const wallet = wallets.find(
            (wallet) =>
                wallet.id === account.id &&
                wallet.addresses.some(
                    (address) =>
                        address.toLowerCase() === account.address.toLowerCase(),
                ),
        );
        if (wallet) provider?.switchAccount?.(wallet, account.address);
    }, [active, account?.address, props.swapBasicData.source_network.name]);
    const model = useWalletWithdrawalController(
        {
            swapBasicData: props.swapBasicData,
            swapId: swapDetails?.id,
            refuel: !!refuel,
        },
        active && !balance.blocked,
    );
    const footer = !active ? null : balance.blocked ? (
        balance.warning
    ) : balance.warning ? (
        <WalletTransferView warning={balance.warning}>
            {model.controls}
        </WalletTransferView>
    ) : (
        model.controls
    );
    return props.children({
        controls: null,
        footer,
        walletProgress: model.walletProgress,
        actionKey: balance.blocked
            ? balance.actionKey
            : `${balance.actionKey}:${model.actionKey}`,
    });
}

function ManualController(props: Props) {
    const state = useSwapDataState();
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const model = useManualWithdrawController(
        {
            ...props,
            depositActions: state.depositActionsResponse,
            refuel: state.refuel,
            quote: state.quote,
            isQuoteLoading: state.quoteIsLoading,
        },
        active,
    );
    return props.children({
        controls: active ? model.controls : null,
        footer: active ? model.footer : null,
        actionKey: 'manual',
    });
}

function ProviderController({ definition, ...props }: Props & { definition: WalletWithdrawal }) {
    const { swapDetails, refuel } = useSwapDataState();
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const state = useProviderWithdrawal({
        swapBasicData: props.swapBasicData,
        swapId: swapDetails?.id,
        refuel: !!refuel,
    }, definition, active);
    const balance = useWithdrawBalance(active, props.onAdjustAmount);
    const connection = useConnectWalletController();
    const network = props.swapBasicData.source_network;
    return props.children({
        controls: null,
        actionKey: balance.blocked ? balance.actionKey : definition.id,
        footer: !active ? null : balance.blocked ? (
            balance.warning
        ) : (
            <WalletTransferView warning={balance.warning}>
                <ProviderWithdrawalControls
                    state={state}
                    provider={definition}
                    network={network}
                    connectButton={<ConnectWalletView {...connection} />}
                />
            </WalletTransferView>
        ),
    });
}
