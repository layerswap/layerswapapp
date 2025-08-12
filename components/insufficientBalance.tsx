import WarningMessage from "./WarningMessage";
import { TokenBalance } from "../Models/Balance";

type ResolverArgs = {
    requestAmount: number | undefined;
    walletBalance: number;
    nativeTokenBalance: TokenBalance | undefined;
    networkGas: number | undefined;
};

export function resolveWarnings({
    requestAmount,
    walletBalance,
    nativeTokenBalance,
    networkGas
}: ResolverArgs) {
    if (requestAmount && walletBalance < requestAmount) {
        return (
            <WarningMessage messageType="warning" className="px-0!">
                <div className="font-normal text-primary-text">
                    You don&apos;t have enough funds to cover the requested amount.
                </div>
            </WarningMessage>
        );
    }

    if (networkGas && nativeTokenBalance && nativeTokenBalance?.amount < networkGas) {
        return (
            <WarningMessage messageType="warning">
                <div className="font-normal text-primary-text">
                    You don&apos;t have enough funds to cover gas fees.
                </div>
            </WarningMessage>
        );
    }

    return null;
}
