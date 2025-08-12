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
            <div className="p-2.5 my-2.5 relative rounded-xl bg-secondary-400">
                <div className='flex items-center'>
                    <InfoIcon className='w-4 h-4' />
                    <p className='text-white font-semibold ml-2.5'>Insufficient Balance</p>
                </div>
                <p className="text-secondary-text ml-[26px] mt-1 text-sm">You don&apos;t have enough balance to complete this transaction, this might cause the transaction to fail please try to enter a smaller amount.</p>
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
