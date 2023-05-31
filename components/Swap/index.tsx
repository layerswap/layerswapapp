import { AlignLeft, Wallet } from 'lucide-react';
import { FC, useEffect, useState } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState, useSwapDataUpdate } from '../../context/swap';
import { GetSwapStatusStep, GetSwapStep } from '../utils/SwapStatus';
import { AuthStep, SwapStep, SwapWithdrawalStep } from '../../Models/Wizard';
import Processing from './Processing';
import Success from './Success';
import Withdraw from '../Wizard/Steps/Withdraw';
import { FormWizardProvider } from '../../context/formWizardProvider';
import GuestCard from '../guestCard';
import { UserType, useAuthState } from '../../context/authContext';


const SwapDetails: FC = () => {
    const { swap } = useSwapDataState()
    const swapStep = GetSwapStep(swap)
    const { setInterval } = useSwapDataUpdate()
    const { userType } = useAuthState()
    useEffect(() => {
        setInterval(15000)
        return () => setInterval(0)
    }, [])

    return (
        <>
            <Widget>
                {
                    swapStep === SwapStep.UserTransferPending &&
                    <Withdraw />
                }
                {
                    (swapStep === SwapStep.TransactionDetected
                        || swapStep === SwapStep.LSTransferPending
                        || swapStep === SwapStep.TransactionDone)
                    &&
                    <Processing />
                }
                {
                    swapStep === SwapStep.Success &&
                    <Success />
                }
            </Widget>
            {
                swapStep === SwapStep.Success && userType && userType != UserType.AuthenticatedUser &&
                <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} hideMenu>
                    <GuestCard />
                </FormWizardProvider>
            }
        </>
    )
}

export default SwapDetails