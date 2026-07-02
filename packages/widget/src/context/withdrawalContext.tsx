import React, { FC } from 'react'

type WalletWithdrawalContextValue = {
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
}

const WalletWithdrawalContext = React.createContext<WalletWithdrawalContextValue | null>(null);

export const WithdrawalProvider: FC<{ onWalletWithdrawalSuccess?: () => void, onCancelWithdrawal?: () => void, children?: React.ReactNode }> = ({ onWalletWithdrawalSuccess, onCancelWithdrawal, children }) => {
    return (
        <WalletWithdrawalContext.Provider value={{ onWalletWithdrawalSuccess, onCancelWithdrawal }}>
            {children}
        </WalletWithdrawalContext.Provider>
    );
}

export function useWalletWithdrawalState() {
    const data = React.useContext(WalletWithdrawalContext);

    if (data === null) {
        throw new Error('useWalletWithdrawalState must be used within a WithdrawalProvider');
    }

    return data;
}
