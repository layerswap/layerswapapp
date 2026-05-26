import { useEffect } from "react";
import { useFormikContext } from "formik";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute } from "@/Models/Network";

/**
 * Auto-fills `destination_address` from the connected wallet account for the
 * currently selected destination network. Mirrors the behavior of the
 * deposit-address form so the wallet and transfer-crypto sub-flows both have a
 * destination address available without each having to re-implement the logic.
 *
 * Manually-added addresses (carried over from other surfaces) are intentionally
 * ignored — when the integrator passes `destination_address` via initial
 * settings, generateSwapInitialValues already seeds it as the Formik default.
 */
export default function useDestinationAddressAutofill() {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const destination = values?.to as NetworkRoute | undefined;
    const destination_address = values?.destination_address;

    const raw = useSelectedAccount("to", destination?.name);
    const account = raw?.id === "manually_added" ? undefined : raw;

    useEffect(() => {
        if (!destination) return;
        const next = account?.address ?? "";
        if (!next) return;
        if ((destination_address ?? "").toLowerCase() === next.toLowerCase()) return;
        setFieldValue("destination_address", next, true);
    }, [destination?.name, account?.address, destination_address, setFieldValue]);
}
