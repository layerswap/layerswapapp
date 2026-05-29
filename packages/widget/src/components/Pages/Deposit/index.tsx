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
import { SupportedDestination, useResolvedDestinations } from "./DestinationTokenPicker";

export type DepositProps = {
    partner?: Partner;
    /** Allowed destination network/token pairs. The user picks from this list
     * via the token dropdown; the network is determined by the chosen token. */
    destinations: SupportedDestination[];
    /** Recipient address on the destination network. Required — the deposit
     * widget never asks the end user for this. */
    destinationAddress: string;
};

const StepRouter: FC<{ step: DepositStep; partner?: Partner; destinationAddress: string }> = ({
    step,
    partner,
    destinationAddress,
}) => {
    switch (step) {
        case "method-picker": return <MethodPicker />;
        case "transfer-crypto": return <TransferCrypto partner={partner} destinationAddress={destinationAddress} />;
        case "wallet-amount":
        case "wallet-processing": return <WalletFlow partner={partner} />;
        default: {
            const _exhaustive: never = step;
            return null;
        }
    }
};

const DepositForm: FC<DepositProps> = ({ partner, destinations, destinationAddress }) => {
    const { step } = useDepositStep();
    return (
        <div className="flex flex-col gap-2 w-full">
            <DepositHeader destinations={destinations} />
            <StepRouter step={step} partner={partner} destinationAddress={destinationAddress} />
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

export const Deposit: FC<DepositProps> = ({ partner, destinations, destinationAddress }) => {
    // `id="widget"` is required because the shared route-picker modal
    // (components/Modal/modalWithoutAnimation.tsx) portals into the element
    // with that id. Without it the picker silently no-ops.
    return (
        <div id="widget" className="relative w-full flex flex-col gap-4 p-4 sm:p-5 bg-secondary-700 rounded-2xl overflow-hidden has-openpicker:min-h-[675px]">
            <SwapDataProvider>
                <DepositInner partner={partner} destinations={destinations} destinationAddress={destinationAddress} />
            </SwapDataProvider>
        </div>
    );
};

export default Deposit;
