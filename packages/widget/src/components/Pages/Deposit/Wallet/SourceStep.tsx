import { FC, useCallback } from "react";
import { useFormikContext } from "formik";
import { FlatContent } from "@/components/Input/RoutePicker/FlatContent";
import useFormRoutes from "@/hooks/useFormRoutes";
import useAllWithdrawalBalances from "@/hooks/useAllWithdrawalBalances";
import { swapInProgress } from "@/components/utils/swapUtils";
import { updateForm } from "@/components/Pages/Swap/Form/updateForm";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { DepositSettings } from "@/lib/AppSettings";
import { useDepositStep } from "../depositStepContext";

const SourceStep: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();

    const { allRoutes, selectedRoute, selectedToken } = useFormRoutes(
        { direction: "from", values },
    );
    const { balances, isLoading: balancesLoading } = useAllWithdrawalBalances();

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

            const defaultUsd = DepositSettings.DefaultAmountUsd;
            const price = token.price_in_usd;
            if (defaultUsd > 0 && price && price > 0) {
                const precision = token.precision || 6;
                const tokenAmount = defaultUsd / price;
                const factor = Math.pow(10, precision);
                const truncated = Math.trunc(tokenAmount * factor) / factor;
                if (truncated > 0) {
                    await updateForm({
                        formDataKey: "amount",
                        formDataValue: truncated.toString(),
                        shouldValidate: true,
                        setFieldValue,
                    });
                }
            }

            push("wallet-amount");
        },
        [setFieldValue, push],
    );

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col max-h-[400px] min-h-0 bg-secondary-700 rounded-2xl">
                <FlatContent
                    routes={allRoutes}
                    balances={balances}
                    balancesLoading={balancesLoading}
                    direction="from"
                    selectedRoute={selectedRoute?.name}
                    selectedToken={selectedToken?.symbol}
                    onSelect={handleSelect}
                />
            </div>
        </div>
    );
};

export default SourceStep;
