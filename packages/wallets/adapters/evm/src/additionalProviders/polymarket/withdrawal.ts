import type { WalletWithdrawal } from '@layerswap/widget-types';

export const polymarketWithdrawal: WalletWithdrawal = {
    id: 'polymarket',
    displayName: 'Polymarket',
    preparationLabel: 'Setting up your account',
    amountDecimals: token => token.decimals ?? 6,
    prepareTransfer(action, amount) {
        if (!action?.to_address || !action.call_data) {
            throw new Error('No depository deposit action');
        }
        return { depositAddress: action.to_address, callData: action.call_data, amount };
    },
};
