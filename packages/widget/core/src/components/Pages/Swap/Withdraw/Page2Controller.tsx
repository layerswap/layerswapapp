import { WalletTransferView } from './Presentation/Page2Sections';
import type { ReactNode } from 'react';
import type { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { NetworkType } from '@layerswap/widget-types';
import { Address } from '@/lib/address/Address';
import { isExtendedSourceNetwork } from '@/lib/extendedRoutes/registry';
import { WithdrawalProvider } from '@/context/withdrawalContext';
import { useSwapDataState } from '@/context/swap';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import useWallet from '@/hooks/useWallet';
import { useSelectedAccount } from '@/context/swapAccounts';
import { useEffect } from 'react';
import { useWithdrawBalance } from './Withdraw';
import { useWalletWithdrawalController } from './Wallet';
import { useManualWithdrawController } from './ManualWithdraw';
import { useHyperliquidWithdrawal } from './WithdrawalProviders/Hyperliquid/useHyperliquidWithdrawal';
import { usePolymarketWithdrawal } from './WithdrawalProviders/Polymarket/usePolymarketWithdrawal';
import { useConnectWalletController } from './Wallet/Common/buttons';
import { ConnectWalletView } from './Presentation/WalletActionsView';
import { SpecializedWithdrawalView } from './Presentation/SpecializedWithdrawalView';
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
    children: (model: Model) => ReactNode;
};

export function Page2Controller(props: Props) {
    const source = props.swapBasicData.source_network;
    const Host = props.swapBasicData.use_deposit_address
        ? ManualController
        : source.type === NetworkType.Polymarket
          ? PolymarketController
          : isExtendedSourceNetwork(source.name)
            ? HyperliquidController
            : WalletController;
    return (
        <WithdrawalProvider
            onWalletWithdrawalSuccess={props.onWalletWithdrawalSuccess}
            onCancelWithdrawal={props.onCancelWithdrawal}
            showProgress={false}
        >
            <Host {...props} />
        </WithdrawalProvider>
    );
}

function WalletController(props: Props) {
    const { swapDetails, refuel } = useSwapDataState();
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const balance = useWithdrawBalance(active);
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

type SpecializedState = ReturnType<typeof useHyperliquidWithdrawal>;
function useSpecializedPresentation(
    props: Props,
    state: SpecializedState,
    provider: 'Hyperliquid' | 'Polymarket',
): Model {
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const balance = useWithdrawBalance(active);
    const connection = useConnectWalletController();
    const network = props.swapBasicData.source_network;
    return {
        controls: null,
        actionKey: balance.blocked ? balance.actionKey : provider,
        footer: !active ? null : balance.blocked ? (
            balance.warning
        ) : (
            <WalletTransferView warning={balance.warning}>
                <SpecializedWithdrawalView
                    {...state}
                    provider={provider}
                    network={network}
                    isConnected={state.isConnected && !!state.wallet}
                    accountMismatch={
                        !!(
                            state.sourceAddress &&
                            state.activeAddress &&
                            !Address.equals(
                                state.activeAddress,
                                state.sourceAddress,
                                network,
                            )
                        )
                    }
                    connectButton={<ConnectWalletView {...connection} />}
                />
            </WalletTransferView>
        ),
    };
}
function HyperliquidController(props: Props) {
    const { swapDetails, refuel } = useSwapDataState();
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const state = useHyperliquidWithdrawal(
        {
            swapBasicData: props.swapBasicData,
            swapId: swapDetails?.id,
            refuel: !!refuel,
        },
        active,
    );
    return props.children(
        useSpecializedPresentation(props, state, 'Hyperliquid'),
    );
}
function PolymarketController(props: Props) {
    const { swapDetails, refuel } = useSwapDataState();
    const active = useResolvedSwapStatus().showWithdrawScreen;
    const state = usePolymarketWithdrawal(
        {
            swapBasicData: props.swapBasicData,
            swapId: swapDetails?.id,
            refuel: !!refuel,
        },
        active,
    );
    return props.children(
        useSpecializedPresentation(props, state, 'Polymarket'),
    );
}
