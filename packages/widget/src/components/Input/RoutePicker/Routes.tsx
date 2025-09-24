import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import { ChevronDown, Info } from "lucide-react";
import RoutePickerIcon from "@/components/Icons/RoutePickerPlaceholder";
import { useBalance } from "@/lib/balances/useBalance";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { GroupedTokenElement, RowElement } from "@/Models/Route";
import { getKey, useBalanceStore } from "@/stores/balanceStore";
import { useBalanceAccounts } from "@/context/balanceAccounts";
import clsx from "clsx";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { ExtendedAddress } from "../Address/AddressPicker/AddressWithIcon";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";

type TokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    type?: RowElement['type'];
    selected: boolean;
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
};

export const CurrencySelectItemDisplay = (props: TokenItemProps) => {
    const { item, route, direction, allbalancesLoaded, type } = props

    return <SelectItem className="group">
        <SelectItem.Logo
            imgSrc={item.logo}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        <NetworkTokenTitle item={item} route={route} direction={direction} allbalancesLoaded={allbalancesLoaded} type={type} />
    </SelectItem>
}

type NetworkTokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    direction: SwapDirection;
    type?: RowElement['type'];
    allbalancesLoaded?: boolean;
}
export const NetworkTokenTitle = (props: NetworkTokenItemProps) => {
    const { item, route, direction, allbalancesLoaded, type } = props
    const balanceAccounts = useBalanceAccounts(direction)
    const selectedAccount = balanceAccounts?.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(route.name));

    const { balances } = useBalance(selectedAccount?.address, route)

    const tokenbalance = balances?.find(b => b.token === item.symbol)

    const formatted_balance_amount = (tokenbalance?.amount || tokenbalance?.amount === 0) ? truncateDecimals(tokenbalance?.amount, item.precision) : ''
    const usdAmount = (tokenbalance?.amount && item?.price_in_usd) ? item?.price_in_usd * tokenbalance?.amount : undefined;

    return <SelectItem.DetailedTitle
        title={item.symbol}
        secondaryImageAlt={route.display_name}
        secondary={
            <div className="flex items-center gap-1">
                <span>{route.display_name}</span>
                {
                    item.contract ?
                        <ExtendedAddress network={route} isForCurrency showDetails address={item.contract} logo={item.logo} title={item.symbol} description={item.display_asset}>
                            <div className="flex items-center gap-1 text-secondary-text text-xs cursor-pointer hover:text-primary-text transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:delay-500">
                                <p className="max-w-[90px] truncate">
                                    <span>•</span> <span>{item.display_asset}</span>
                                </p>
                                <Info className="h-3 w-3" />
                            </div>
                        </ExtendedAddress>
                        :
                        <p className="flex items-center gap-1 text-xs text-secondary-text transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:delay-500">
                            <span>•</span>
                            <p className="truncate max-w-[80px]">{item.display_asset}</p>
                        </p>
                }
            </div>
        }
        secondaryLogoSrc={route.logo}
    >
        {(allbalancesLoaded && tokenbalance && Number(tokenbalance?.amount) >= 0) ? (
            <span className="text-sm text-secondary-text text-right my-auto leading-4 font-medium">
                {Number(usdAmount) >= 0 && (
                    <div
                        className={clsx("text-primary-text",
                            {
                                'text-lg leading-[22px]': type === 'suggested_token',
                            }
                        )}
                    >{formatUsd(usdAmount)}</div>
                )}
                <div
                    className={clsx({
                        'text-xs leading-4': type == 'suggested_token',
                    })}
                >
                    {formatted_balance_amount}
                </div>
            </span>
        ) : !allbalancesLoaded ? (
            <span className="px-0.5">-</span>
        ) : (
            <></>
        )}
    </SelectItem.DetailedTitle>
}

type NetworkRouteItemProps = {
    item: NetworkRoute;
    selected: boolean;
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
    hideTokenImages?: boolean;
}

export const NetworkRouteSelectItemDisplay = (props: NetworkRouteItemProps) => {
    const { item, direction, allbalancesLoaded, hideTokenImages } = props
    const balanceAccounts = useBalanceAccounts(direction)

    const selectedAccount = balanceAccounts?.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(item.name));
    const { balances, totalInUSD } = useBalance(selectedAccount?.address, item)
    const tokensWithBalance = balances?.filter(b => b.amount && b.amount > 0)
        ?.map(b => b.token);
    const filteredNetworkTokens = item?.tokens?.filter(token =>
        tokensWithBalance?.includes(token.symbol)
    );

    const hasLoadedBalances = allbalancesLoaded && Number(totalInUSD) >= 0;
    const showTokenLogos = hasLoadedBalances && filteredNetworkTokens?.length;

    return (
        <SelectItem className="bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7 py-2">
            <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} className="rounded-md" />
            <SelectItem.Title>
                <>
                    <span>{item.display_name}</span>

                    {hasLoadedBalances ? (
                        <div className={`${showTokenLogos ? "flex flex-col space-y-0.5" : ""} ${hideTokenImages ? "hidden" : ""}`}>
                            <span className="text-secondary-text text-sm leading-4 font-medium">
                                {formatUsd(totalInUSD)}
                            </span>

                            {showTokenLogos ? (
                                <div className="flex justify-end items-center -space-x-2 relative h-4">
                                    {filteredNetworkTokens.slice(0, 3).map((t, index) => (
                                        <ImageWithFallback
                                            key={`${t.symbol}-${index}`}
                                            src={t.logo}
                                            alt={`${t.symbol} logo`}
                                            height="16"
                                            width="16"
                                            loading="eager"
                                            fetchPriority='high'
                                            className="rounded-full object-contain"
                                        />
                                    ))}
                                    {filteredNetworkTokens.length > 3 && (
                                        <div className="w-4 h-4 bg-secondary-600 text-primary-text text-[8px] rounded-full flex items-center justify-center border-2 border-background">
                                            <span>+{filteredNetworkTokens.length - 3}</span>
                                        </div>
                                    )}
                                </div>
                            ) : <></>}
                        </div>
                    ) : !allbalancesLoaded ? (
                        <span className="px-0.5">-</span>
                    ) : <></>}

                    <ChevronDown
                        className="!w-3.5 !h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
                        aria-hidden="true"
                    />
                </>
            </SelectItem.Title>
        </SelectItem>
    );
};

type SelectedCurrencyDisplayProps = {
    value: {
        logo: string
        symbol: string
    } | undefined;
    placeholder: string;
}

export const GroupedTokenHeader = ({
    item,
    direction,
    allbalancesLoaded,
    hideTokenImages
}: {
    item: GroupedTokenElement;
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
    hideTokenImages?: boolean;
}) => {
    const balanceAccounts = useBalanceAccounts(direction)

    const tokens = item.items;

    const balances = useBalanceStore(s => s.balances)

    const networksWithBalance: NetworkRoute[] = Array.from(
        new Map(
            tokens
                .map(({ route }) => {
                    const address = balanceAccounts.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(route.route.name))?.address
                    const key = address && route.route ? getKey(address, route.route) : 'unknown'

                    const tokenSymbol = route.token.symbol;
                    const networkRoute = route.route;

                    const networkBalances = balances?.[key];
                    const balanceEntry = networkBalances?.data?.balances?.find(
                        (b) => b.token === tokenSymbol && b.amount && b.amount >= 0
                    );

                    return balanceEntry ? [networkRoute.name, networkRoute] as const : null;
                })
                .filter((entry): entry is readonly [string, NetworkRoute] => !!entry)
        ).values()
    );

    const tokenBalances = tokens.reduce((acc, { route }) => {
        const address = balanceAccounts.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(route.route.name))?.address
        const key = address && route.route ? getKey(address, route.route) : 'unknown'

        const tokenSymbol = route.token.symbol;
        const networkName = route.route.name;
        const price = route.token.price_in_usd;

        const networkBalances = balances?.[key];
        const balanceEntry = networkBalances?.data?.balances?.find(
            (b) => b.token === tokenSymbol
        );

        if (!balanceEntry?.amount) return acc;
        return { sum: acc.sum + balanceEntry.amount * price, hasVale: true };
    }, { sum: 0, hasVale: false });

    const mainToken = tokens[0]?.route.token;
    const hasLoadedBalances = allbalancesLoaded && tokenBalances.hasVale && Number(tokenBalances.sum) >= 0;
    const showNetworkIcons = hasLoadedBalances && networksWithBalance.length > 0;

    return (
        <SelectItem className="bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7 py-2">
            <SelectItem.Logo
                imgSrc={mainToken.logo}
                altText={`${mainToken.symbol} logo`}
                className="rounded-full"
            />
            <SelectItem.Title>
                <>
                    <span>{mainToken.symbol}</span>

                    {hasLoadedBalances ? (
                        <div className={`${showNetworkIcons ? "flex flex-col space-y-0.5" : ""} ${hideTokenImages ? "invisible" : "visible"}`}>
                            <span className="text-secondary-text text-sm leading-4 font-medium">
                                {formatUsd(tokenBalances.sum)}
                            </span>

                            {showNetworkIcons && (
                                <div className="flex justify-end items-center -space-x-1.5 relative h-4">
                                    {networksWithBalance.slice(0, 3).map((network, index) => (
                                        <ImageWithFallback
                                            key={`${network.display_name}-${index}`}
                                            src={network.logo}
                                            alt={`${network.display_name} logo`}
                                            height="16"
                                            width="16"
                                            loading="eager"
                                            fetchPriority="high"
                                            className="rounded-full object-contain"
                                        />
                                    ))}
                                    {networksWithBalance.length > 3 && (
                                        <div className="w-4 h-4 bg-secondary-600 text-primary-text text-[8px] rounded-full flex items-center justify-center border-2 border-background">
                                            <span>+{networksWithBalance.length - 3}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : balances ? (
                        <div className="px-0.5">-</div>
                    ) : <></>}

                    <ChevronDown
                        className="!w-3.5 !h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
                        aria-hidden="true"
                    />
                </>
            </SelectItem.Title>
        </SelectItem>
    );
};


export const SelectedCurrencyDisplay = (props: SelectedCurrencyDisplayProps) => {
    const { value, placeholder } = props
    return <span className='flex flex-col text-left items-center text-xs md:text-base'>
        {
            value?.logo && <div className="flex items-center">
                <div className="shrink-0 h-6 w-6 relative">
                    <ImageWithFallback
                        src={value.logo}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        fetchPriority='high'
                        className="rounded-full object-contain"
                    />
                </div>
            </div>
        }
        {value ?
            <span className="ml-3 flex font-medium flex-auto space-x-1 text-primary-text items-center">
                {value.symbol}
            </span>
            :
            <span className="block font-medium text-primary-text-tertiary flex-auto items-center">
                {placeholder}
            </span>
        }
    </span>
}

type SelectedRouteDisplayProps = {
    route?: NetworkRoute;
    token?: NetworkRouteToken;
    placeholder: string;
}

export const SelectedRouteDisplay = ({ route, token, placeholder }: SelectedRouteDisplayProps) => {
    const showContent = token && route;

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {showContent ? (
                <>
                    <div className="inline-flex items-center relative shrink-0">
                        <ImageWithFallback
                            src={token.logo}
                            alt="Token Logo"
                            height="24"
                            width="24"
                            loading="eager"
                            fetchPriority="high"
                            className="rounded-full object-contain"
                        />
                        <ImageWithFallback
                            src={route.logo}
                            alt="Network Logo"
                            height="12"
                            width="12"
                            loading="eager"
                            fetchPriority="high"
                            className="h-3.5 w-3.5 absolute left-3.5 top-3.5 object-contain rounded border-1 border-secondary-300"
                        />
                    </div>
                    <div className="ml-3 flex flex-col grow font-medium text-primary-text overflow-hidden min-w-0 max-w-3/4 group-[.exchange-picker]:max-w-full">
                        <p className="leading-5">{token.symbol}</p>
                        <p className="text-secondary-text grow font-normal text-sm leading-4 truncate whitespace-nowrap">
                            {route.display_name}
                        </p>
                    </div>
                </>
            ) : (
                <SelectedRoutePlaceholder placeholder={placeholder} />
            )}
            <span className="px-1 pr-2 pointer-events-none text-primary-text">
                <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    )
}

export const SelectedRoutePlaceholder = ({ placeholder }: { placeholder: string }) => (
    <>
        <div className="inline-flex items-center relative py-1">
            <RoutePickerIcon className="w-7 h-7" />
        </div>
        <span className="flex text-secondary-text text-base font-normal leading-5 flex-auto items-center max-w-3/4 group-[.exchange-picker]:max-w-full">
            <span className="ml-2 text-sm sm:text-base sm:leading-5 whitespace-nowrap">{placeholder}</span>
        </span>
    </>
)