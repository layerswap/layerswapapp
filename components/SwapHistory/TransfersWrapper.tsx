import { FC } from "react";
import TransactionsHistory from ".";
import { useAuthState, UserType } from "../../context/authContext";
import { FormWizardProvider } from "../../context/formWizardProvider";
import { TimerProvider } from "../../context/timerContext";
import { AuthStep } from "../../Models/Wizard";
import GuestCard from "../guestCard";

const TransfersWrapper: FC = () => {
    const { userType } = useAuthState()

    return (
        <div className="md:mb-12">
            <TransactionsHistory />
            {
                userType != UserType.AuthenticatedUser &&
                <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} hideMenu>
                    <TimerProvider>
                        <GuestCard />
                    </TimerProvider>
                </FormWizardProvider>
            }
        </div>
    )
};

export default TransfersWrapper;