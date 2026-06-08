import { FC } from "react";
import { Formik } from "formik";
import { Partner } from "@/Models/Partner";
import { SwapDataProvider } from "@/context/swap";
import { useDepositStep } from "../depositStepContext";
import { useDepositInitialValues } from "../depositSelectionContext";
import { DepositWalletProvider } from "./depositWalletContext";
import EcosystemStep from "./EcosystemStep";
import SourceStep from "./SourceStep";
import AmountStep from "./AmountStep";
import ProcessingStep from "./ProcessingStep";

type Props = {
    partner?: Partner;
};

const Comp: FC<Props> = ({ partner }) => {
    const { step } = useDepositStep();
    if (step === "wallet-ecosystem") return <EcosystemStep />;
    if (step === "wallet-source") return <SourceStep />;
    if (step === "wallet-amount") return <AmountStep />;
    if (step === "wallet-processing") return <ProcessingStep partner={partner} />;
    return null;
};

const WalletFlowInner: FC<Props> = ({ partner }) => {
    const initialValues = useDepositInitialValues("wallet");
    // No-op submit: the wallet flow never goes through Formik submit. AmountStep
    // persists the form via setSubmitedFormValues/setSwapId and pushes to the
    // processing step, which renders SwapDetails from this flow's provider.
    return (
        <Formik initialValues={initialValues} validateOnMount onSubmit={() => { }}>
            <div className="flex flex-col min-h-[400px] h-full">
                <Comp partner={partner} />
            </div>
        </Formik>
    );
};

/**
 * Wallet transfer sub-flow (source → amount → processing). Owns its own
 * SwapDataProvider + Formik so its swap lifecycle and form state are isolated
 * from the deposit-address flow (mirrors the per-tab separation in the main
 * swap flow). StepRouter renders this component for all three wallet-* steps,
 * so the providers stay mounted across the steps and only reset on exit.
 */
const WalletFlow: FC<Props> = ({ partner }) => (
    <DepositWalletProvider>
        <SwapDataProvider>
            <WalletFlowInner partner={partner} />
        </SwapDataProvider>
    </DepositWalletProvider>
);

export default WalletFlow;
