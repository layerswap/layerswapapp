import { FC } from "react";
import { Partner } from "@/Models/Partner";
import { useDepositStep } from "../depositStepContext";
import AmountStep from "./AmountStep";
import ProcessingStep from "./ProcessingStep";

type Props = {
    partner?: Partner;
};

const WalletFlow: FC<Props> = ({ partner }) => {
    const { step } = useDepositStep();
    if (step === "wallet-amount") return <AmountStep />;
    if (step === "wallet-processing") return <ProcessingStep partner={partner} />;
    return null;
};

export default WalletFlow;
