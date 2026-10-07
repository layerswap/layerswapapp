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
            overview={summary}
            controls={
                instructions && (
                    <div className="flex flex-col gap-3">{instructions}</div>
                )
            }
            workflow={
                processing && (
                    <div className="flex flex-col gap-3">{processing}</div>
                )
            }
        />
    );
}
