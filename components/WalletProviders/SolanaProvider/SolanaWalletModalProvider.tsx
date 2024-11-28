import type { FC, ReactNode } from 'react';
import React, { useState } from 'react';
import { WalletModal } from './SolanaWalletModal';
import { WalletModalContext } from './useWalletModal';

export interface WalletModalProviderProps {
    children: ReactNode;
}

export const WalletModalProvider: FC<WalletModalProviderProps> = ({ children }) => {
    const [visible, setVisible] = useState<{ show: boolean, network: 'solana' | 'eclipse' } | undefined>(undefined);

    return (
        <WalletModalContext.Provider
            value={{
                visible,
                setVisible,
            }}
        >
            {children}
            {visible && <WalletModal />}
        </WalletModalContext.Provider>
    );
};
