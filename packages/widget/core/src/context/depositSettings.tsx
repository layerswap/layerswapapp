import { createContext, ReactNode, useContext, useMemo } from "react";
import { DEPOSIT_METHODS, DepositMethodId } from "@/components/Pages/Deposit/depositMethods";

export type DepositSettingsValue = {
    /** Show the "Send to" destination address row in the quote summary. */
    showDestinationAddress: boolean;
    /** Label for the primary action button. `undefined` means "use the
     * consumer's own default". */
    actionButtonText: string | undefined;
    /** Default amount (in USD) seeded into the wallet flow. 0 disables seeding. */
    defaultAmountUsd: number;
    /** Allow-list of deposit methods the picker may show. Defaults to all
     * methods; a method also still needs its own runtime condition to appear. */
    methods: DepositMethodId[];
    /** True when rendered inside the Deposit widget. Drives deposit-specific
     * copy in the shared processing timeline. Not integrator-configurable. */
    isDepositFlow: boolean;
};

// Outside a provider (the regular swap flow) `actionButtonText` is undefined so
// consumers apply their own fallback (e.g. "Swap now").
const CONTEXT_DEFAULTS: DepositSettingsValue = {
    showDestinationAddress: true,
    actionButtonText: undefined,
    defaultAmountUsd: 1,
    methods: [...DEPOSIT_METHODS],
    isDepositFlow: false,
};

// The deposit flow's own default label. Lives here as the single source of
// truth — DepositCard passes the integrator's raw prop and this fills the gap.
const DEPOSIT_ACTION_BUTTON_TEXT = "Deposit";

const DepositSettingsContext = createContext<DepositSettingsValue>(CONTEXT_DEFAULTS);

/**
 * Per-instance deposit configuration. Replaces the old `DepositSettings` mutable
 * statics, which were a global singleton — two `<Deposit>` widgets on the same
 * page would stomp on each other's config, and writing them during render
 * violated React's rules. Scoping the values to a Context makes each widget
 * instance independent.
 */
export function DepositSettingsProvider({
    value,
    children,
}: {
    value: Partial<Omit<DepositSettingsValue, 'isDepositFlow'>>;
    children: ReactNode;
}) {
    const merged = useMemo<DepositSettingsValue>(
        () => ({
            showDestinationAddress: value.showDestinationAddress ?? false,
            actionButtonText: value.actionButtonText || DEPOSIT_ACTION_BUTTON_TEXT,
            defaultAmountUsd: value.defaultAmountUsd ?? 1,
            methods: value.methods ?? [...DEPOSIT_METHODS],
            isDepositFlow: true,
        }),
        [value.showDestinationAddress, value.actionButtonText, value.defaultAmountUsd, value.methods],
    );
    return (
        <DepositSettingsContext.Provider value={merged}>
            {children}
        </DepositSettingsContext.Provider>
    );
}

/**
 * Reads the current deposit settings. Returns defaults when used outside a
 * `DepositSettingsProvider` (e.g. the regular swap flow), so shared components
 * like the quote summary and submit button work in both contexts.
 */
export function useDepositSettings(): DepositSettingsValue {
    return useContext(DepositSettingsContext);
}
