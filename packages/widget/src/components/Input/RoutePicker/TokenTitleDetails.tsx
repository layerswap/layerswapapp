import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { Info } from "lucide-react";
import { ExtendedAddress } from "../Address/AddressPicker/AddressWithIcon";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { TokenBalance } from "@/Models/Balance";
type TokenTitleWithBalanceProps = {
    item: NetworkRouteToken;
    route: NetworkRoute;
    tokenbalance?: TokenBalance;
    usdAmount?: number;
}

export const TokenInfoIcon = ({ item, route, className, iconOnly = false }: { item: NetworkRouteToken, route: NetworkRoute, className?: string, iconOnly?: boolean }) => (
    <div className={className}>
        <ExtendedAddress
            network={item.contract ? route : undefined}
            isForCurrency
            showDetails
            address={item.contract || `${route.display_name} native coin`}
            logo={item.logo}
            title={item.symbol}
            description={item.display_asset}
            isNativeToken={!item.contract}
        >
            <div className={`flex items-center gap-1 text-secondary-text cursor-pointer hover:text-primary-text ${iconOnly ? '' : 'text-xs'}`}>
                {!iconOnly && (
                    <p className="max-w-[90px] truncate">
                        <span>•</span> <span>{item.display_asset || item.symbol}</span>
                    </p>
                )}
                <Info className={iconOnly ? "h-4 w-4" : "h-3 w-3"} />
            </div>
        </ExtendedAddress>
    </div>
);

export const TokenTitleWithBalance = ({ item, route, tokenbalance, usdAmount }: TokenTitleWithBalanceProps) => {
    return (
        <div className="flex items-center gap-2 justify-between w-full">
            <div className="flex items-center gap-2">
                <p>
                    {item.symbol}
                </p>
                <TokenInfoIcon
                    item={item}
                    route={route}
                    iconOnly
                    className="hidden xs:block transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:delay-400 click-delay-on-hover"
                />
            </div>
            {(tokenbalance && Number(tokenbalance?.amount) > 0 && Number(usdAmount) > 0) && (
                <div className="text-primary-text text-lg leading-[22px] font-medium">{formatUsd(usdAmount)}</div>
            )}
        </div>
    );
};

