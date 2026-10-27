import type { ReactNode } from 'react';
import type { Network, WalletWithdrawal } from '@layerswap/widget-types';
import { Address } from '@/lib/address/Address';
import { SpecializedWithdrawalView } from '../Presentation/SpecializedWithdrawalView';
import { ConnectWalletButton } from '../Wallet/Common/buttons';
import type { WithdrawPageProps } from '../Wallet/Common/sharedTypes';
import { useProviderWithdrawal, type ProviderWithdrawalState } from './useProviderWithdrawal';

export function ProviderWithdrawalControls({ state, provider, network, connectButton }: {
    state: ProviderWithdrawalState;
    provider: WalletWithdrawal;
    network: Network;
    connectButton: ReactNode;
}) {
    return <SpecializedWithdrawalView
        {...state}
        provider={provider.displayName}
        preparationLabel={provider.preparationLabel}
        network={network}
        accountMismatch={!!(state.sourceAddress && state.activeAddress
            && !Address.equals(state.activeAddress, state.sourceAddress, network))}
        connectButton={connectButton}
    />;
}

export function ProviderWalletWithdrawal({ definition, ...props }: WithdrawPageProps & { definition: WalletWithdrawal }) {
    const state = useProviderWithdrawal(props, definition);
    return <ProviderWithdrawalControls
        state={state}
        provider={definition}
        network={props.swapBasicData.source_network}
        connectButton={<ConnectWalletButton />}
    />;
}
