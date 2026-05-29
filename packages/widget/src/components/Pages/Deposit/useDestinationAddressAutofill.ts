import { useEffect } from "react";
import { useFormikContext } from "formik";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useInitialSettings } from "@/context/settings";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute } from "@/Models/Network";

type Args = {
    enabled?: boolean;
};

/**
 * Auto-fills `destination_address` from the connected wallet account for the
 * currently selected destination network. Mirrors the behavior of the
 * deposit-address form so the wallet sub-flow has a destination address
 * available without re-implementing the logic.
 *
 * Skipped when the integrator pins `destination_address` via initial settings —
 * the pinned value wins, even if the connected wallet's account for the
 * destination network would resolve to something different.
 */
export default function useDestinationAddressAutofill({ enabled = true }: Args = {}) {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const initialSettings = useInitialSettings();
    const destination = values?.to as NetworkRoute | undefined;
    const destination_address = values?.destination_address;

    const raw = useSelectedAccount("to", destination?.name);
    const account = raw?.id === "manually_added" ? undefined : raw;

    const integratorPinned = !!initialSettings.destination_address;

    useEffect(() => {
        if (!enabled) return;
        if (integratorPinned) return;
        if (!destination) return;
        const next = account?.address ?? "";
        if (!next) return;
        if ((destination_address ?? "").toLowerCase() === next.toLowerCase()) return;
        setFieldValue("destination_address", next, true);
    }, [enabled, integratorPinned, destination?.name, account?.address, destination_address, setFieldValue]);
}
