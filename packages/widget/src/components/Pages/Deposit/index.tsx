"use client";
import { FC, useCallback, useMemo } from "react";
import { Formik } from "formik";
import toast from "react-hot-toast";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { Partner } from "@/Models/Partner";
import useWallet from "@/hooks/useWallet";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { DepositStep, DepositStepProvider, useDepositStep } from "./depositStepContext";
import DepositHeader from "./DepositHeader";
import MethodPicker from "./Options/MethodPicker";
import WalletFlow from "./Wallet";
import TransferCrypto from "./TransferCrypto";
import useDestinationAddressAutofill from "./useDestinationAddressAutofill";

export type DepositProps = {
    partner?: Partner;
};

const StepRouter: FC<{ step: DepositStep; partner?: Partner }> = ({ step, partner }) => {
    switch (step) {
        case "method-picker": return <MethodPicker />;
        case "transfer-crypto": return <TransferCrypto partner={partner} />;
        case "wallet-amount":
        case "wallet-processing": return <WalletFlow partner={partner} />;
        default: {
            const _exhaustive: never = step;
            return null;
        }
    }
};

const DepositForm: FC<DepositProps> = ({ partner }) => {
    const { step } = useDepositStep();
    // DepositAddressForm has its own destination_address autofill, so we skip
    // ours on the transfer-crypto step to avoid running the same effect twice.
    useDestinationAddressAutofill({ enabled: step !== "transfer-crypto" });
    return (
        <div className="flex flex-col gap-2 w-full">
            <DepositHeader />
            <StepRouter step={step} partner={partner} />
        </div>
    );
};

const DepositInner: FC<DepositProps> = ({ partner }) => {
    const settings = useSettingsState();
    const initialSettings = useInitialSettings();
    const { wallets } = useWallet();
    const { createSwap, setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    const connectedAutofillNetworks = useMemo(() => {
        const set = new Set<string>();
        wallets.forEach(w => {
            w.autofillSupportedNetworks?.forEach(n => set.add(n.toLowerCase()));
        });
        return set;
    }, [wallets]);

    const initialValues: SwapFormValues = useMemo(
        () => generateSwapInitialValues(settings, initialSettings, "deposit-address", connectedAutofillNetworks),
        [],
    );

    const handleSubmit = useCallback(
        async (values: SwapFormValues) => {
            // The wallet sub-flow does not go through Formik submit — its
            // Review step calls setSubmitedFormValues directly and pushes to
            // the processing step. Only the deposit-address flow ends up here,
            // triggered by DepositAddressForm's auto-submit effect.
            if (values.depositMethod === "wallet") return;

            if (setSwapError) setSwapError("");
            setSubmitedFormValues(values);
            try {
                const swap = await createSwap(values, initialSettings, partner);
                setSwapId(swap.swap.id);
            } catch (error) {
                const data: ApiError = error?.response?.data?.error;
                if (data?.code === LSAPIKnownErrorCode.BLACKLISTED_ADDRESS) {
                    toast.error("You can't transfer to that address. Please double check.");
                } else if (data?.code === LSAPIKnownErrorCode.INVALID_ADDRESS_ERROR) {
                    toast.error(`Enter a valid ${values.to?.display_name} address`);
                } else {
                    toast.error(data?.message || error?.message || "Could not create swap");
                }
            }
        },
        [createSwap, setSwapId, setSubmitedFormValues, setSwapError, initialSettings, partner],
    );

    return (
        <Formik initialValues={initialValues} validateOnMount onSubmit={handleSubmit}>
            <DepositStepProvider>
                <DepositForm partner={partner} />
            </DepositStepProvider>
        </Formik>
    );
};

export const Deposit: FC<DepositProps> = ({ partner }) => {
    // `id="widget"` is required because the shared route-picker modal
    // (components/Modal/modalWithoutAnimation.tsx) portals into the element
    // with that id. Without it the picker silently no-ops.
    return (
        <div id="widget" className="relative w-full flex flex-col gap-4 p-4 sm:p-5 bg-secondary-700 rounded-2xl overflow-hidden has-openpicker:min-h-[675px]">
            <SwapDataProvider>
                <DepositInner partner={partner} />
            </SwapDataProvider>
        </div>
    );
};

export default Deposit;
