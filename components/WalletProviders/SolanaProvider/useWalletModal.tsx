import { createContext, useContext } from 'react';

export interface WalletModalContextState {
    visible: { show: boolean, network: 'solana' | 'eclipse' } | undefined;
    setVisible: (open: { show: boolean, network: 'solana' | 'eclipse' } | undefined) => void;
}

const DEFAULT_CONTEXT = {
    setVisible(_open: { show: boolean, network: 'solana' | 'eclipse' }) {
        console.error(constructMissingProviderErrorMessage('call', 'setVisible'));
    },
    visible: undefined,
};
Object.defineProperty(DEFAULT_CONTEXT, 'visible', {
    get() {
        console.error(constructMissingProviderErrorMessage('read', 'visible'));
        return undefined;
    },
});

function constructMissingProviderErrorMessage(action: string, valueName: string) {
    return (
        'You have tried to ' +
        ` ${action} "${valueName}"` +
        ' on a WalletModalContext without providing one.' +
        ' Make sure to render a WalletModalProvider' +
        ' as an ancestor of the component that uses ' +
        'WalletModalContext'
    );
}

export const WalletModalContext = createContext<WalletModalContextState>(DEFAULT_CONTEXT as WalletModalContextState);

export function useWalletModal(): WalletModalContextState {
    return useContext(WalletModalContext);
}
