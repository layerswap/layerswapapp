import { FC } from "react";
import { Formik } from "formik";
import { Partner } from "@/Models/Partner";
import { SwapDataProvider } from "@/context/swap";
import { ValidationProvider } from "@/context/validationContext";
import { useDepositStep } from "../depositStepContext";
import { useDepositInitialValues } from "../depositSelectionContext";
import { useSourceRoute } from "../Options/useHyperliquidDepositOption";
import ConnectStep from "./ConnectStep";
import SourceStep from "./SourceStep";
import AmountStep from "./AmountStep";
import ProcessingStep from "./ProcessingStep";

type Props = {
    partner?: Partner;
};

const Comp: FC<Props> = ({ partner }) => {
    const { step } = useDepositStep();
    if (step === "wallet-connect") return <ConnectStep />;
    if (step === "wallet-source") return <SourceStep />;
    if (step === "wallet-amount") return <AmountStep />;
    if (step === "wallet-processing") return <ProcessingStep partner={partner} />;
    return null;
};

const WalletFlowInner: FC<Props> = ({ partner }) => {
    const { presetSourceNetwork } = useDepositStep();
    const presetSource = useSourceRoute(presetSourceNetwork);
    const initialValues = useDepositInitialValues("wallet", presetSource);

    return (
        <Formik initialValues={initialValues} validateOnMount onSubmit={() => { }}>
            <ValidationProvider>
                <div className="flex flex-col min-h-[373px] h-full">
                    <Comp partner={partner} />
                </div>
            </ValidationProvider>
        </Formik>
    );
};

const WalletFlow: FC<Props> = ({ partner }) => (
    <SwapDataProvider>
        <WalletFlowInner partner={partner} />
    </SwapDataProvider>
);

export default WalletFlow;
