import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import { ChevronDown } from "lucide-react";
import RoutePickerIcon from "@/components/icons/RoutePickerPlaceholder";
import { useBalance } from "@/lib/balances/useBalance";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { GroupedTokenElement, RowElement } from "@/Models/Route";
import { getKey, useBalanceStore } from "@/stores/balanceStore";
import { useSwapAccounts } from "@/context/swapAccounts";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { getTotalBalanceInUSD } from "@/helpers/balanceHelper";
import { useMemo, memo } from "react";
import { TokenInfoIcon, TokenTitleWithBalance } from "./TokenTitleDetails";

type TokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    type?: RowElement['type'];
    selected: boolean;
    direction: SwapDirection;
};

export const CurrencySelectItemDisplay = memo((props: TokenItemProps) => {
    const { item, route, direction, type } = props

    return <SelectItem className="group">
        <SelectItem.Logo
            imgSrc={item.logo}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        <NetworkTokenTitle item={item} route={route} direction={direction} type={type} />
    </SelectItem>
});

type NetworkTokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    direction: SwapDirection;
    type?: RowElement['type'];
}

export const NetworkTokenTitle = (props: NetworkTokenItemProps) => {
    const { item, route, direction } = props
    const swapAccounts = useSwapAccounts(direction)
    const selectedAccount = swapAccounts?.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(route.name));

    const { balances } = useBalance(selectedAccount?.address, route)

    const tokenbalance = balances?.find(b => b.token === item.symbol)

    const formatted_balance_amount = (tokenbalance?.amount || tokenbalance?.amount === 0) ? truncateDecimals(tokenbalance?.amount, item.precision) : ''
    const usdAmount = (tokenbalance?.amount && item?.price_in_usd) ? item?.price_in_usd * tokenbalance?.amount : undefined;

    return <SelectItem.DetailedTitle
        title={<TokenTitleWithBalance
            item={item}
            route={route}
            tokenbalance={tokenbalance}
            usdAmount={usdAmount}
        />}
        secondaryImageAlt={route.display_name}
        secondary={
            <div className="flex items-center gap-1">
                <span className="truncate">{route.display_name}</span>
                <TokenInfoIcon
                    item={item}
                    route={route}
                    className="xs:hidden max-w-0 group-hover:max-w-full data-[popover-open=true]:max-w-full data-[tooltip-open=true]:max-w-full overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 data-[popover-open=true]:opacity-100 data-[tooltip-open=true]:opacity-100 data-[popover-open=true]:delay-0 data-[tooltip-open=true]:delay-0 group-hover:delay-400 shrink-0 pointer-events-none group-hover:pointer-events-auto data-[popover-open=true]:pointer-events-auto data-[tooltip-open=true]:pointer-events-auto"
                />
            </div>
        }
        secondaryLogoSrc={route.logo}
    >
        {(tokenbalance && Number(tokenbalance?.amount) > 0) ? (
            <span className="text-sm text-secondary-text text-right my-auto font-medium block">
                <div className='text-xs leading-4 truncate'>
                    {formatted_balance_amount}
                </div>
            </span>
        ) : <></>}
    </SelectItem.DetailedTitle>
}

type NetworkRouteItemProps = {
    item: NetworkRoute;
    selected: boolean;
    direction: SwapDirection;
    hideTokenImages?: boolean;
}

export const NetworkRouteSelectItemDisplay = (props: NetworkRouteItemProps) => {
    const { item, direction, hideTokenImages } = props
    const swapAccounts = useSwapAccounts(direction)

    const selectedAccount = swapAccounts?.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(item.name));
    const networkBalances = useBalance(selectedAccount?.address, item)
    const totalInUSD = useMemo(() => networkBalances ? getTotalBalanceInUSD(networkBalances, item) : undefined, [networkBalances.balances, item])
    const tokensWithBalance = networkBalances.balances?.filter(b => b.amount && b.amount > 0)
        ?.map(b => b.token);
    const filteredNetworkTokens = item?.tokens?.filter(token =>
        tokensWithBalance?.includes(token.symbol)
    );

    const hasLoadedBalances = totalInUSD !== null && Number(totalInUSD) > 0;
    const showTokenLogos = hasLoadedBalances && filteredNetworkTokens?.length;

    return (
        <SelectItem className="accordion-item-focused bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7 py-2 ring-hidden">
            <SelectItem.Logo imgSrc={item.logo} altText={`${item.display_name} logo`} className="rounded-md" />
            <SelectItem.Title>
                <>
                    <span>
                        {item.display_name}
                    </span>

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
                    ) : <></>}

                    <ChevronDown
                        className="w-3.5! h-3.5! absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
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
    hideTokenImages
}: {
    item: GroupedTokenElement;
    direction: SwapDirection;
    hideTokenImages?: boolean;
}) => {
    const swapAccounts = useSwapAccounts(direction)

    const tokens = item.items;
    const balances = useBalanceStore(s => s.balances)

    const networksWithBalance: NetworkRoute[] = Array.from(
        new Map(
            tokens
                .map(({ route }) => {
                    const address = swapAccounts.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(route.route.name))?.address
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
        const address = swapAccounts.find(w => (direction == 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(route.route.name))?.address
        const key = address && route.route ? getKey(address, route.route) : 'unknown'

        const tokenSymbol = route.token.symbol;
        const price = route.token.price_in_usd;

        const networkBalances = balances?.[key];
        const balanceEntry = networkBalances?.data?.balances?.find(
            (b) => b.token === tokenSymbol
        );

        if (!balanceEntry?.amount) return acc;
        return { sum: acc.sum + balanceEntry.amount * price, hasVale: true };
    }, { sum: 0, hasVale: false });

    const mainToken = tokens[0]?.route.token;
    const hasLoadedBalances = tokenBalances.hasVale && Number(tokenBalances.sum) >= 0;
    const showNetworkIcons = hasLoadedBalances && networksWithBalance.length > 0;

    return (
        <SelectItem className="accordion-item-focused bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7 py-2">
            <SelectItem.Logo
                imgSrc={mainToken.logo}
                altText={`${mainToken.symbol} logo`}
                className="rounded-full"
            />
            <SelectItem.Title>
                <>
                    <span>
                        {mainToken.symbol}
                    </span>
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
                    ) : <></>}

                    <ChevronDown
                        className="w-3.5! h-3.5! absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
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
                    <div className="inline-flex items-center relative shrink-0 h-7 w-7">
                        <div className="h-6 w-6">
                            <ImageWithFallback
                                src={token.logo}
                                alt="Token Logo"
                                height="24"
                                width="24"
                                loading="eager"
                                fetchPriority="high"
                                className="rounded-full object-contain"
                            />
                        </div>
                        <div className="absolute left-[13px] top-3.5 h-4 w-4 rounded border border-secondary-500 bg-secondary-400 overflow-hidden">
                            <ImageWithFallback
                                src={route.logo}
                                alt="Network Logo"
                                height="14"
                                width="14"
                                loading="eager"
                                fetchPriority="high"
                                className="object-contain"
                            />
                        </div>

                    </div>
                    <div className="ml-2 flex flex-col grow text-primary-text overflow-hidden min-w-0 max-w-3/4 group-[.exchange-picker]:max-w-full xs:max-w-[60px]"                    >
                        <p className="text-base leading-5 font-medium">{token.symbol}</p>
                        <p className="text-secondary-text grow text-sm font-normal leading-4 truncate whitespace-nowrap">
                            {route.display_name}
                        </p>
                    </div>
                </>
            ) : (
                <SelectedRoutePlaceholder placeholder={placeholder} />
            )}
            <span className="px-2 pointer-events-none text-primary-text">
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