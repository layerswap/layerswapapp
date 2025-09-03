import InfoIcon from "./icons/InfoIcon";

type ResolverArgs = {
    requestAmount: number | undefined;
    walletBalance: number;
};

export function resolveBalanceWarnings({
    requestAmount,
    walletBalance,
}: ResolverArgs) {
    if (requestAmount && walletBalance < requestAmount) {
        return (
            <div className="p-2 my-3 relative rounded-xl bg-secondary-400 flex flex-row">
                <div className='grow'>
                    <InfoIcon className='w-6 h-6 p-0.5 ' />
                </div>

                <div className='px-2'>
                    <p className='text-white font-semibold text-base'>Insufficient Balance</p>
                    <p className="text-secondary-text mt-1 text-sm">
                        You don&apos;t have enough balance to complete this transaction, this might cause the transaction to fail please try to enter a smaller amount.
                    </p>
                </div>
            </div>
        );
    }

    // if (networkGas && nativeTokenBalance && nativeTokenBalance?.amount < networkGas) {
    //     return (
    //         <WarningMessage messageType="warning">
    //             <div className="font-normal text-primary-text">
    //                 You don&apos;t have enough funds to cover gas fees.
    //             </div>
    //         </WarningMessage>
    //     );
    // }

    return null;
}
