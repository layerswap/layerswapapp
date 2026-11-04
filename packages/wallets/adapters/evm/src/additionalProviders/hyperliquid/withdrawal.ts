import type { WalletWithdrawal } from '@layerswap/widget-types';

export const hyperliquidWithdrawal: WalletWithdrawal = {
    id: 'hyperliquid',
    displayName: 'Hyperliquid',
    preparationLabel: 'Preparing balance',
    prepareTransfer(action, amount) {
        if (!action?.to_address) {
            throw new Error('No deposit address');
        }
        if (!action.amount_in_base_units) {
            throw new Error('No withdrawal amount');
        }
        return {
            depositAddress: action.to_address,
            amount: action.amount ?? amount,
            amountInBaseUnits: action.amount_in_base_units,
            callData: '',
            ...(action.token ? { token: action.token } : {}),
        };
    },
};
