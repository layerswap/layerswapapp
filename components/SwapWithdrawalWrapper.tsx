import { FC } from "react";
import { useAuthState, UserType } from "../context/authContext";
import { FormWizardProvider, useFormWizardState } from "../context/formWizardProvider";
import { TimerProvider } from "../context/timerContext";
import { AuthStep, SwapWithdrawalStep } from "../Models/Wizard";
import GuestCard from "./guestCard";
import SwapWithdrawalWizard from "./Wizard/SwapWithdrawalWizard";

const SwapWithdrawalWrapper: FC = () => {
    const { currentStepName } = useFormWizardState()
    const { userType } = useAuthState()

    return (
        <>
            <SwapWithdrawalWizard />
            {
                currentStepName != SwapWithdrawalStep.Success && userType && userType != UserType.AuthenticatedUser &&
                <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} hideMenu>
                    <TimerProvider>
                        <GuestCard />
                    </TimerProvider>
                </FormWizardProvider>
            }
        </>
    )
};

export default SwapWithdrawalWrapper;