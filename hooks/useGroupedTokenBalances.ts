import useSelectedWalletStore from "@/context/selectedAccounts/pickerSelectedWallets";
import { useBalance } from "@/lib/balances/providers/useBalance";
import { GroupedTokenElement } from "@/Models/Route";
import { useMemo } from "react";


export const useGroupedTokenBalances = ({
    item,
    direction,
    destAddress,
    allBalancesLoaded
}: {
    item: GroupedTokenElement;
    direction: "from" | "to";
    destAddress?: string;
    allBalancesLoaded?: boolean;
}) => {
    const { items } = item;
    const { pickerSelectedWallets } = useSelectedWalletStore(direction);

    const tokenData = items.map(({ route }) => {
        const network = route.route;
        const token = route.token;

        const matchedWallet = pickerSelectedWallets?.find(w =>
            (direction === "from"
                ? w.wallet?.withdrawalSupportedNetworks
                : w.wallet?.autofillSupportedNetworks
            )?.includes(network.name)
        );

        const address = direction === "to" && destAddress ? destAddress : matchedWallet?.address;
        return {
            token,
            network,
            address,
            useBalanceResult: useBalance(address, network),
        };
    });

    const totalInUSD = useMemo(() => {
        return tokenData.reduce((sum, { token, useBalanceResult }) => {
            const balances = useBalanceResult.balances;
            const entry = balances?.find(b => b.token === token.symbol);
            return entry ? sum + entry.amount * token.price_in_usd : sum;
        }, 0);
    }, [tokenData]);

    const networksWithBalance = useMemo(() => {
        return tokenData
            .filter(({ token, network, useBalanceResult }) => {
                const balances = useBalanceResult.balances;
                return balances?.some(b => b.token === token.symbol && b.amount > 0);
            })
            .map(({ network }) => network)
            .filter((value, index, self) =>
                index === self.findIndex(n => n.name === value.name)
            );
    }, [tokenData]);

    const hasLoadedBalances = allBalancesLoaded && totalInUSD >= 0;

    return {
        totalInUSD,
        hasLoadedBalances,
        networksWithBalance,
        mainToken: items[0]?.route.token,
    };
};
