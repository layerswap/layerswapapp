import { FC, useCallback, useState } from "react";
import { useFormikContext } from "formik";
import { Selector } from "@/components/Select/Selector/Index";
import { Content } from "@/components/Input/RoutePicker/Content";
import PickerWalletConnect from "@/components/Input/RoutePicker/RouterPickerWalletConnect";
import useFormRoutes from "@/hooks/useFormRoutes";
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import useWallet from "@/hooks/useWallet";
import { swapInProgress } from "@/components/utils/swapUtils";
import { updateForm } from "@/components/Pages/Swap/Form/updateForm";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useDepositStep } from "../depositStepContext";

const SourceStep: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { push } = useDepositStep();
    const { wallets } = useWallet();

    const [searchQuery, setSearchQuery] = useState("");
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 });

    const { routeElements, selectedRoute, selectedToken } = useFormRoutes(
        { direction: "from", values },
        searchQuery,
        suggestionsLimit,
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
            push("wallet-amount");
        },
        [setFieldValue, push],
    );

    return (
        <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-col max-h-[400px] min-h-0 bg-secondary-700 rounded-2xl">
                    <Content
                        onSelect={handleSelect}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        rowElements={routeElements}
                        direction="from"
                        selectedRoute={selectedRoute?.name}
                        selectedToken={selectedToken?.symbol}
                    />
                </div>
        </div>
    );
};

export default SourceStep;
