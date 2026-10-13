import { FC, useCallback } from "react";
import { Partner } from "@/Models/Partner";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { ValidationProvider } from "@/context/validationContext";
import SwapForm from "@/components/Pages/Swap/Form/SwapForm";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useDepositStep } from "../depositStepContext";
import { useDepositInitialValues } from "../depositSelectionContext";
import { useSourceRoute } from "../Options/useSourceRoute";
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
    const { presetSourceNetwork, push } = useDepositStep();
    const presetSource = useSourceRoute(presetSourceNetwork);
    const initialValues = useDepositInitialValues("wallet", presetSource);
    const { setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    // Reached through Formik submit from AmountStep's "Continue", so SwapForm
    // reports form_submitted before the processing step creates the swap.
    const handleContinue = useCallback(async (values: SwapFormValues) => {
        if (setSwapError) setSwapError("");
        setSubmitedFormValues({ ...values, depositMethod: "wallet" });
        setSwapId(undefined);
        push("wallet-processing");
    }, [setSwapError, setSubmitedFormValues, setSwapId, push]);

    return (
        <SwapForm
            mode="deposit-widget-wallet"
            submitPath="DepositWalletFlow"
            submitAction="continue"
            initialValues={initialValues}
            validateOnMount
            onSubmit={handleContinue}
        >
            <ValidationProvider>
                <div className="flex flex-col min-h-[373px] h-full">
                    <Comp partner={partner} />
                </div>
            </ValidationProvider>
        </SwapForm>
    );
};

const WalletFlow: FC<Props> = ({ partner }) => (
    <SwapDataProvider>
        <WalletFlowInner partner={partner} />
    </SwapDataProvider>
);

export default WalletFlow;
