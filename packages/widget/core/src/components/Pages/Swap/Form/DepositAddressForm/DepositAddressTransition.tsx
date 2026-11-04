import type { ReactNode } from 'react';
import { WalletExecutionTransition } from '../../Withdraw/Presentation/WalletExecutionTransition';

/** Exchange the address instructions for progress without snapping the form height. */
export function DepositAddressTransition({
    instructions,
    processing,
    summary,
}: {
    instructions?: ReactNode;
    processing?: ReactNode;
    summary?: ReactNode;
}) {
    return (
        <WalletExecutionTransition
            gap={12}
            overview={summary}
            controls={instructions}
            workflow={processing}
        />
    );
}
