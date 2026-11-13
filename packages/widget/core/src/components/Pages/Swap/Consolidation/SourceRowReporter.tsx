import { FC, useMemo } from "react";
import { useFormikContext } from "formik";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { useSelectedAccount } from "@/context/swapAccounts";
import useWallet from "@/hooks/useWallet";
import { useBalance } from "@/lib/balances/useBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
import { useQuoteData, validDestinationAddress } from "@/hooks/useFee";
import { useReportConsolidationRow } from "@/context/consolidationQuotes";
import { isNativeToken, resolveRowIssue, RowIssue } from "@/helpers/consolidation";
import { SwapFormValues } from "../Form/SwapFormValues";

type Props = {
    id: string;
    from: NetworkRoute;
    fromAsset: NetworkRouteToken;
    amount: string;
    routeAvailable: boolean;
};

/** Quotes, limits, balance and gas for one source; mounted for every source, visible or not. */
const SourceRowReporter: FC<Props> = ({ id, from, fromAsset, amount, routeAvailable }) => {
    const { values } = useFormikContext<SwapFormValues>();
    const { to, toAsset, destination_address } = values;
    const account = useSelectedAccount("from", from.name);
    const { wallets } = useWallet(from, "withdrawal");
    const wallet = wallets.find(w => w.id === account?.id);
    const { balances } = useBalance(account?.address, from);
    const quoteArgs = useMemo(() => routeAvailable ? {
        from: from.name,
        fromCurrency: fromAsset.symbol,
        to: to?.name,
        toCurrency: toAsset?.symbol,
        amount,
        refuel: false,
        depositMethod: "wallet" as const,
        destinationAddress: validDestinationAddress(destination_address, to),
    } : undefined, [routeAvailable, from.name, fromAsset.symbol, to, toAsset?.symbol, amount, destination_address]);
    const { quote, minAllowedAmount, maxAllowedAmount, quoteError, isQuoteLoading } = useQuoteData(quoteArgs, { refreshInterval: undefined });
    const { gasData, isGasLoading } = useSWRGas(account?.address, from, fromAsset, Number(amount) > 0 ? amount : undefined, wallet);

    const balance = balances?.find(b => b.network === from.name && b.token === fromAsset.symbol)?.amount;
    const nativeBalance = balances?.find(b => b.network === from.name && b.token === from.token?.symbol)?.amount;
    const quoteMessage = quoteError?.response?.data?.error?.message || quoteError?.message;
    const issue: RowIssue | undefined = resolveRowIssue({
        asset: fromAsset.asset,
        network: from.display_name,
        destinationLabel: `${toAsset?.asset ?? ""} on ${to?.display_name ?? ""}`,
        amount,
        routeAvailable,
        balance,
        minAmount: minAllowedAmount,
        maxAmount: maxAllowedAmount,
    }) ?? (quoteMessage ? { kind: "no_route", badge: "No quote", message: quoteMessage } : undefined);
    const gasPrice = gasData?.token?.price_in_usd;

    useReportConsolidationRow(id, {
        id,
        asset: fromAsset.asset,
        network: from.name,
        networkDisplayName: from.display_name,
        amount,
        isNative: isNativeToken(from, fromAsset),
        priceUsd: quote?.quote.source_token?.price_in_usd ?? fromAsset.price_in_usd,
        quote: quote?.quote,
        receiveAmount: quote?.quote.receive_amount,
        minReceiveAmount: quote?.quote.min_receive_amount,
        feesUsd: quote?.quote.total_fee_in_usd,
        avgCompletionTime: quote?.quote.avg_completion_time,
        gas: gasData ? { gas: gasData.gas, maxFee: gasData.maxFee, reserve: gasData.reserve } : undefined,
        gasUsd: gasData && gasPrice ? gasData.gas * gasPrice : undefined,
        balance,
        nativeBalance,
        nativeSymbol: from.token?.symbol,
        minAmount: minAllowedAmount,
        maxAmount: maxAllowedAmount,
        issue,
        loading: !!quoteArgs && Number(amount) > 0 && (isQuoteLoading || isGasLoading),
    });
    return null;
};

export default SourceRowReporter;
