import { FC } from "react";
import { Partner } from "@/Models/Partner";
import { useDepositStep } from "../depositStepContext";
import SourceStep from "./SourceStep";
import AmountStep from "./AmountStep";
import ProcessingStep from "./ProcessingStep";

type Props = {
    partner?: Partner;
};

const Comp: FC<Props> = ({ partner }) => {
    const { step } = useDepositStep();
    if (step === "wallet-source") return <SourceStep />;
    if (step === "wallet-amount") return <AmountStep />;
    if (step === "wallet-processing") return <ProcessingStep partner={partner} />;
    return null;
};

const WalletFlow: FC<Props> = ({ partner }) => (
    <div className="flex flex-col min-h-[400px] h-full">
        <Comp partner={partner} />
    </div>
);

export default WalletFlow;
