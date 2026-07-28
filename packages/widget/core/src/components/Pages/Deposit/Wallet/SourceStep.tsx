import { FC, useCallback, useMemo } from "react";
import { useFormikContext } from "formik";
import { FlatContent } from "@/components/Input/RoutePicker/FlatContent";
import useFormRoutes from "@/hooks/useFormRoutes";
import useAllWithdrawalBalances from "@/hooks/useAllWithdrawalBalances";
import { swapInProgress } from "@/components/utils/swapUtils";
import { updateForm } from "@/components/Pages/Swap/Form/updateForm";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositSettings } from "@/context/depositSettings";
import { useLatestSourceAccount } from "@/context/swapAccounts";
import { useDepositStep } from "../depositStepContext";
import { filterRoutesByAccount } from "./filterRoutesByAccounts";
import { seedDefaultAmount } from "../seedDefaultAmount";
import { CircleAlert } from "lucide-react";

const SourceStep: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { defaultAmountUsd } = useDepositSettings();
    const sourceAccount = useLatestSourceAccount();

    const { allRoutes, selectedRoute, selectedToken } = useFormRoutes(
        { direction: "from", values },
    );
    const { balances, isLoading: balancesLoading } = useAllWithdrawalBalances();

    // Restrict the source list to the networks the latest-connected wallet can
    // send from. Without an account (shouldn't happen on this step) fall back
    // to all.
    const routes = useMemo(
        () => filterRoutesByAccount(allRoutes, sourceAccount),
        [allRoutes, sourceAccount],
    );

    const handleSelect = useCallback(
        async (route: NetworkRoute, token: NetworkRouteToken) => {
            swapInProgress.current = false;
            await updateForm({
                formDataKey: "fromAsset",
                formDataValue: token,
                shouldValidate: true,
                setFieldValue,
            });
            await updateForm({
                formDataKey: "from",
                formDataValue: route,
                shouldValidate: true,
                setFieldValue,
            });

            const seededAmount = seedDefaultAmount(token, defaultAmountUsd);
            if (seededAmount) {
                await updateForm({
                    formDataKey: "amount",
                    formDataValue: seededAmount,
                    shouldValidate: true,
                    setFieldValue,
                });
            }

            push("wallet-amount");
        },
        [setFieldValue, push, defaultAmountUsd],
    );

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col h-[373px] bg-secondary-700 rounded-2xl overflow-hidden">
                <div className="flex-1 min-h-0">
                    <FlatContent
                        routes={routes}
                        balances={balances}
                        balancesLoading={balancesLoading}
                        direction="from"
                        selectedRoute={selectedRoute?.name}
                        selectedToken={selectedToken?.symbol}
                        onSelect={handleSelect}
                        onlyWithBalance
                        emptyState={<NoBalancesEmptyState />}
                    />
                </div>
            </div>
        </div>
    );
};

const NoBalancesEmptyState: FC = () => (
    <div className="flex flex-col items-center justify-center text-center h-full min-h-[260px] px-6 gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary-500 text-primary-text">
            <CircleAlert className="h-7 w-7 text-primary-text" />
        </div>
        <p className="text-sm text-secondary-text leading-5">
            There are no tokens available in your wallet.
            <br />
            Please connect a different wallet.
        </p>
    </div>
);

export default SourceStep;
