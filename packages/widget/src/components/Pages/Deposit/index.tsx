"use client";
import { FC, useCallback, useMemo } from "react";
import { Formik } from "formik";
import clsx from "clsx";
import toast from "react-hot-toast";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { Partner } from "@/Models/Partner";
import useWallet from "@/hooks/useWallet";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { Dialog, DialogContent, DialogTrigger } from "@/components/shadcn/dialog";
import { DepositStep, DepositStepProvider, useDepositStep } from "./depositStepContext";
import DepositHeader from "./DepositHeader";
import MethodPicker from "./Options/MethodPicker";
import WalletFlow from "./Wallet";
import TransferCrypto from "./TransferCrypto";
import { SupportedDestination, useResolvedDestinations } from "./DestinationTokenPicker";
import Stepper from "./_shared/Stepper";
import { Widget } from "@/components/Widget/Index";

export type DepositMode = "inline" | "button";

export type DepositProps = {
    partner?: Partner;
    /** Allowed destination network/token pairs. The user picks from this list
     * via the token dropdown; the network is determined by the chosen token. */
    destinations: SupportedDestination[];
    /** Recipient address on the destination network. Required — the deposit
     * widget never asks the end user for this. */
    destinationAddress: string;
    /** "inline" (default) renders the widget directly. "button" renders a Pay
     * button that opens the widget inside a dialog. */
    mode?: DepositMode;
    /** Label for the trigger button when mode="button". Defaults to "Pay". */
    buttonLabel?: string;
    /** Extra className applied to the trigger button when mode="button". */
    buttonClassName?: string;
};

const StepRouter: FC<{ step: DepositStep; partner?: Partner; destinations: SupportedDestination[]; destinationAddress: string }> = ({
    step,
    partner,
    destinations,
    destinationAddress,
}) => {
    switch (step) {
        case "method-picker": return <MethodPicker destinations={destinations} />;
        case "transfer-crypto": return <TransferCrypto partner={partner} destinationAddress={destinationAddress} />;
        case "wallet-amount":
        case "wallet-processing": return <WalletFlow partner={partner} />;
        default: {
            void (step satisfies never);
            return null;
        }
    }
};

const DepositForm: FC<DepositProps> = ({ partner, destinations, destinationAddress }) => {
    const { step } = useDepositStep();
    return (
        <div className="flex flex-col gap-3 w-full pt-4">
            <DepositHeader />
            <Stepper step={step} />
            <StepRouter step={step} partner={partner} destinations={destinations} destinationAddress={destinationAddress} />
        </div>
    );
};

const DepositInner: FC<DepositProps> = ({ partner, destinations, destinationAddress }) => {
    const settings = useSettingsState();
    const initialSettings = useInitialSettings();
    const { wallets } = useWallet();
    const { createSwap, setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();
    const resolvedDestinations = useResolvedDestinations(destinations);

    const connectedAutofillNetworks = useMemo(() => {
        const set = new Set<string>();
        wallets.forEach(w => {
            w.autofillSupportedNetworks?.forEach(n => set.add(n.toLowerCase()));
        });
        return set;
    }, [wallets]);

    const initialValues: SwapFormValues = useMemo(() => {
        const base = generateSwapInitialValues(settings, initialSettings, "deposit-address", connectedAutofillNetworks);
        const firstDestination = resolvedDestinations[0];
        return {
            ...base,
            to: firstDestination?.network ?? base.to,
            toAsset: firstDestination?.token ?? base.toAsset,
            destination_address: destinationAddress,
        };
    }, []);

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
                <DepositForm partner={partner} destinations={destinations} destinationAddress={destinationAddress} />
            </DepositStepProvider>
        </Formik>
    );
};


const DepositCard: FC<Pick<DepositProps, "partner" | "destinations" | "destinationAddress">> = ({ partner, destinations, destinationAddress }) => (
    <Widget hideMenu>
        <SwapDataProvider>
            <DepositInner partner={partner} destinations={destinations} destinationAddress={destinationAddress} />
        </SwapDataProvider>
    </Widget>
);

export const Deposit: FC<DepositProps> = ({ mode = "inline", buttonLabel = "Deposit", buttonClassName, partner, destinations, destinationAddress }) => {
    if (mode === "button") {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className={clsx(
                            "navigation-focus-ring-text-bold-lg enabled:active:animate-press-down bg-primary-500 text-primary-buttonTextColor font-medium rounded-full px-6 py-2 hover:brightness-110 transition duration-200 ease-in-out focus:outline-none",
                            buttonClassName,
                        )}
                    >
                        {buttonLabel}
                    </button>
                </DialogTrigger>
                <DialogContent className="!p-0 !bg-transparent !ring-0 !gap-0 sm:!max-w-md">
                    <DepositCard partner={partner} destinations={destinations} destinationAddress={destinationAddress} />
                </DialogContent>
            </Dialog>
        );
    }
    return <DepositCard partner={partner} destinations={destinations} destinationAddress={destinationAddress} />;
};

export default Deposit;
