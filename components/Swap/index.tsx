import { FC, useEffect } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState, useSwapDataUpdate } from '../../context/swap';
import { GetSwapStep, ResolvePollingInterval } from '../utils/SwapStatus';
import { AuthStep, SwapStep } from '../../Models/Wizard';
import { FormWizardProvider } from '../../context/formWizardProvider';
import GuestCard from '../guestCard';
import { UserType, useAuthState } from '../../context/authContext';
import Withdraw from './Withdraw';
import Processing from './Withdraw/Processing';
import Success from './Withdraw/Success';
import Failed from './Withdraw/Failed';
import Delay from './Withdraw/Delay';


const SwapDetails: FC = () => {
    const { swap } = useSwapDataState()
    const swapStep = GetSwapStep(swap)
    const { setInterval } = useSwapDataUpdate()
    const { userType } = useAuthState()

    useEffect(() => {
        setInterval(ResolvePollingInterval(swapStep))
        return () => setInterval(0)
    }, [swapStep])

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
                {
                    swapStep === SwapStep.Failed &&
                    <Failed />
                }
                {
                    swapStep === SwapStep.Delay &&
                    <Delay />
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