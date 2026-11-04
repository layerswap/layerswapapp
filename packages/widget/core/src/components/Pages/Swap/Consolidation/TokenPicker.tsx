import { FC, SetStateAction, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useFormikContext } from "formik";
import { CircleAlert } from "lucide-react";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import SubmitButton from "@/components/Buttons/submitButton";
import { Modal, ModalContent } from "@/components/Modal/modalWithoutAnimation";
import { Checkbox } from "@/components/shadcn/checkbox";
import RouteSearch from "@/components/Input/RoutePicker/RouteSearch";
import { CurrencySelectItemDisplay } from "@/components/Input/RoutePicker/Routes";
import { filterRoutesByAccount } from "@/components/Pages/Deposit/Wallet/filterRoutesByAccounts";
import useFormRoutes from "@/hooks/useFormRoutes";
import useAllWithdrawalBalances from "@/hooks/useAllWithdrawalBalances";
import { useSettingsState } from "@/context/settings";
import { useSelectedAccount } from "@/context/swapAccounts";
import { consolidationSourceId, filterEligibleSources, MAX_CONSOLIDATION_SOURCES, PRIMARY_ROW_ID, tokenBalanceAmount } from "@/helpers/consolidation";
import { isExtendedSourceNetwork } from "@/lib/extendedRoutes/registry";
import { resolverService } from "@/lib/resolvers/resolverService";
import { ConsolidationSource, SwapFormValues } from "../Form/SwapFormValues";
import { Pill } from "./parts";

export type TokenPickerMode = { kind: "add" } | { kind: "replace", id: string };

type Props = {
    mode: TokenPickerMode | undefined;
    onClose: () => void;
};

type Item = { id: string, route: NetworkRoute, token: NetworkRouteToken, balance: number, usd: number, reachable: boolean };

const hasWithdrawalProvider = (route: NetworkRoute) => !!resolverService.getTransferResolver().getWithdrawalProvider(route);

/** Tokens the wallet holds that can join the send; adds several at once or replaces one row. */
const TokenPicker: FC<Props> = ({ mode, onClose }) => {
    const { values, setValues, setFieldValue } = useFormikContext<SwapFormValues>();
    const { sourceRoutes } = useSettingsState();
    const { allRoutes } = useFormRoutes({ direction: "from", values });
    const { balances } = useAllWithdrawalBalances();
    const account = useSelectedAccount("from", values.from?.name);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const extraSources = values.extraSources ?? [];
    const replacing = mode?.kind === "replace" ? mode.id : undefined;

    useEffect(() => {
        setQuery("");
        setSelected([]);
    }, [mode]);

    const items = useMemo<Item[]>(() => {
        const eligible = filterEligibleSources({
            routes: filterRoutesByAccount(sourceRoutes, account),
            balances,
            primary: replacing === PRIMARY_ROW_ID ? {} : { network: values.from?.name, token: values.fromAsset?.symbol },
            excluded: extraSources.map(source => source.id).filter(id => id !== replacing),
            isExtended: isExtendedSourceNetwork,
            hasWithdrawalProvider,
        });
        return eligible.flatMap(route => route.tokens.map(token => {
            const balance = tokenBalanceAmount(balances, route.name, token.symbol);
            const reachableRoute = allRoutes.find(r => r.name === route.name);
            const reachableToken = reachableRoute?.tokens.find(t => t.symbol === token.symbol);
            return {
                id: consolidationSourceId(route.name, token.symbol),
                route: reachableRoute ?? route,
                token: reachableToken ?? token,
                balance,
                usd: balance * (token.price_in_usd ?? 0),
                reachable: !!reachableToken,
            };
        })).sort((a, b) => b.usd - a.usd);
    }, [sourceRoutes, account, balances, values.from?.name, values.fromAsset?.symbol, extraSources, replacing, allRoutes]);

    const search = query.trim().toLowerCase();
    const visible = search
        ? items.filter(item => item.token.asset.toLowerCase().includes(search) || item.token.symbol.toLowerCase().includes(search) || item.route.display_name.toLowerCase().includes(search))
        : items;
    const reachable = visible.filter(item => item.reachable);
    const unreachable = visible.filter(item => !item.reachable);
    const total = 1 + extraSources.length + selected.length;
    const full = total >= MAX_CONSOLIDATION_SOURCES;

    const handleItem = (item: Item) => {
        if (!item.reachable) return;
        if (replacing === PRIMARY_ROW_ID) {
            void setValues({ ...values, from: item.route, fromAsset: item.token, amount: "", amountMode: "manual", amountPresetSource: undefined, amountPresetPending: false, amountPresetError: undefined }, true);
            onClose();
            return;
        }
        if (replacing) {
            const source: ConsolidationSource = { id: item.id, from: item.route, fromAsset: item.token, amount: "" };
            void setFieldValue("extraSources", extraSources.map(s => s.id === replacing ? (s.id === item.id ? s : source) : s), true);
            onClose();
            return;
        }
        setSelected(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : full ? ids : [...ids, item.id]);
    };

    const handleAdd = () => {
        const added = selected.map(id => items.find(item => item.id === id)).filter((item): item is Item => !!item)
            .map<ConsolidationSource>(item => ({ id: item.id, from: item.route, fromAsset: item.token, amount: "" }));
        void setFieldValue("extraSources", [...extraSources, ...added], true);
        onClose();
    };

    const title = replacing ? "Change token" : "Add token";
    const counter = replacing ? "" : `${total} of ${MAX_CONSOLIDATION_SOURCES}`;
    const destinationLabel = `Can't send to ${values.toAsset?.asset ?? ""} on ${values.to?.display_name ?? ""}`;
    const addText = selected.length === 1 ? "Add 1 token" : `Add ${selected.length} tokens`;
    const setIsOpen = (value: SetStateAction<boolean>) => {
        const open = typeof value === "function" ? value(!!mode) : value;
        if (!open) onClose();
    };

    const currentId = replacing === PRIMARY_ROW_ID && values.from && values.fromAsset ? consolidationSourceId(values.from.name, values.fromAsset.symbol) : replacing;
    const renderItem = (item: Item) => {
        const checked = replacing ? item.id === currentId : selected.includes(item.id);
        const disabled = !item.reachable || (!replacing && !checked && full);
        return (
            <button
                key={item.id}
                type="button"
                aria-pressed={checked}
                disabled={disabled}
                onClick={() => handleItem(item)}
                className={clsx("w-full flex items-center gap-2 pl-3 rounded-xl text-left outline-none transition-colors duration-150", {
                    "bg-secondary-500": checked,
                    "hover:bg-secondary-500 cursor-pointer": !checked && !disabled,
                    "cursor-default": disabled,
                })}
            >
                {!replacing ? <Checkbox checked={checked} disabled={!item.reachable} className="pointer-events-none w-4 h-4" /> : null}
                <span className={clsx("flex-1 min-w-0", { "opacity-50": !item.reachable })}>
                    <CurrencySelectItemDisplay item={item.token} route={item.route} direction="from" type="suggested_token" selected={false} hideBalances={!item.reachable} />
                </span>
                {!item.reachable ? <Pill className="mr-3 shrink-0">No route</Pill> : null}
            </button>
        );
    };

    return (
        <Modal isOpen={!!mode} setIsOpen={setIsOpen}>
            <ModalContent header={
                <span className="w-full flex items-center justify-between gap-2">
                    <span className="text-primary-text text-lg font-semibold">{title}</span>
                    <span className="text-sm font-normal text-secondary-text">{counter}</span>
                </span>
            }>
                {() => (
                    <div className="flex flex-col h-full min-h-0 gap-3">
                        <RouteSearch searchQuery={query} setSearchQuery={setQuery} shouldFocus direction="from" />
                        <div className="flex-1 min-h-0 overflow-y-auto styled-scroll flex flex-col gap-3">
                            {
                                reachable.length || unreachable.length ? (
                                    <>
                                        {reachable.length ? (
                                            <div className="flex flex-col gap-1">
                                                <p className="text-primary-text-tertiary text-base font-normal leading-5 pl-1">In your wallet</p>
                                                {reachable.map(renderItem)}
                                            </div>
                                        ) : null}
                                        {unreachable.length ? (
                                            <div className="flex flex-col gap-1">
                                                <p className="text-primary-text-tertiary text-base font-normal leading-5 pl-1">{destinationLabel}</p>
                                                {unreachable.map(renderItem)}
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center h-full min-h-64 px-6 gap-4">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary-500 text-primary-text">
                                            <CircleAlert className="h-7 w-7" />
                                        </div>
                                        <p className="text-sm text-secondary-text leading-5">
                                            <span className="block text-primary-text">No other tokens to add</span>
                                            <span>Tokens this wallet holds on supported networks show up here.</span>
                                        </p>
                                    </div>
                                )
                            }
                        </div>
                        {
                            !replacing && items.length ? (
                                <SubmitButton type="button" isDisabled={!selected.length} onClick={handleAdd}>
                                    {addText}
                                </SubmitButton>
                            ) : null
                        }
                    </div>
                )}
            </ModalContent>
        </Modal>
    );
};

export default TokenPicker;
