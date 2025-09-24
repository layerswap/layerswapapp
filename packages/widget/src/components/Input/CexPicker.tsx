import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { Selector, SelectorContent, SelectorTrigger } from "../Select/Selector/Index";
import { Exchange } from "@/Models/Exchange";
import { SelectItem } from "../Select/Selector/SelectItem";
import useFormRoutes from "@/hooks/useFormRoutes";
import { LayoutGroup, motion } from "framer-motion";
import { SearchComponent } from "./Search";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { ChevronDown } from "lucide-react";
import { updateForm } from "../Pages/Swap/Form/updateForm";
import { SwapDirection, SwapFormValues } from "../Pages/Swap/Form/SwapFormValues";

const CexPicker: FC = () => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const direction = "from"

    const { exchanges, exchangesRoutesLoading: isLoading, selectedRoute, selectedToken, exchangeNetworks } = useFormRoutes({ direction, values });
    const { fromExchange } = values;
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const updateValues = async () => {
            if (!fromExchange) return;
            const sourceRoute = exchangeNetworks?.[0] as any

            const sourceRouteToken = sourceRoute?.token
            //TODO refactor form types
            if (sourceRouteToken !== selectedToken) {
                setFieldValue('from', sourceRoute?.network, true)
                setFieldValue('fromAsset', sourceRouteToken, true)
            }
        };

        updateValues();
    }, [selectedRoute, selectedToken, exchangeNetworks, exchanges, values]);

    const handleSelect = useCallback(async (exchange: Exchange) => {
        updateForm({
            formDataKey: 'fromExchange',
            formDataValue: exchange,
            shouldValidate: true,
            setFieldValue
        });
    }, [direction, values])

    return (
        <div className="flex w-full flex-col self-end relative ml-auto items-center">
            <Selector>
                <SelectorTrigger disabled={false} className="bg-secondary-500 !p-3">
                    <SelectedExchangeDisplay exchange={fromExchange} placeholder="Select Exchange" />
                </SelectorTrigger>
                <SelectorContent isLoading={isLoading} searchHint="Search">
                    {({ closeModal, shouldFocus }) => {
                        return (
                            <div className="overflow-y-auto flex flex-col h-full z-40 openpicker" >
                                <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} isOpen={shouldFocus} />
                                <LayoutGroup>
                                    <motion.div layoutScroll className="select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden styled-scroll pr-3 h-full">
                                        <div className="relative">
                                            {exchanges.map((exchange) => {
                                                return <div className="py-1 box-border" key={exchange.name}>
                                                    <ExchangeNetwork
                                                        route={exchange}
                                                        direction={direction}
                                                        onSelect={(n) => {
                                                            handleSelect(n);
                                                            closeModal();
                                                        }}
                                                    />
                                                </div>
                                            })}
                                        </div>
                                    </motion.div>
                                </LayoutGroup>
                            </div>
                        )
                    }}
                </SelectorContent>
            </Selector>
        </div>
    )
}

type ExchangeNetworkProps = {
    route: Exchange;
    direction: SwapDirection;
    onSelect: (route: Exchange) => void;
}

const ExchangeNetwork = (props: ExchangeNetworkProps) => {
    const { route, onSelect } = props

    return <div className="bg-secondary-500 cursor-pointer hover:bg-secondary-400 rounded-xl outline-none disabled:cursor-not-allowed relative" onClick={() => onSelect(route)} >
        <SelectItem>
            <SelectItem.Logo imgSrc={route.logo} altText={`${route.display_name} logo`} />
            <SelectItem.Title className="py-3">{route.display_name}</SelectItem.Title>
        </SelectItem>
    </div>
}

type SelectedNetworkDisplayProps = {
    exchange?: Exchange;
    placeholder: string;
}

export const SelectedExchangeDisplay = (props: SelectedNetworkDisplayProps) => {
    const { exchange, placeholder } = props

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {exchange ? (
                <>
                    <div className="inline-flex items-center relative shrink-0 h-7 w-7">
                        <ImageWithFallback
                            src={exchange.logo}
                            alt="Token Logo"
                            height="28"
                            width="28"
                            loading="eager"
                            fetchPriority="high"
                            className="rounded-md object-contain"
                        />
                    </div>
                    <span className="ml-2 flex flex-col font-medium text-primary-text overflow-hidden min-w-0 max-w-3/5">
                        {exchange.display_name}
                    </span>
                </>
            ) : (
                <SelectedEchangePlaceholder placeholder={placeholder} />
            )}
            <span className="absolute right-0 px-1 pr-2 pointer-events-none text-primary-text">
                <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    )
}

export const SelectedEchangePlaceholder = ({ placeholder }: { placeholder: string }) => (
    <>
        <div className="inline-flex w-7 h-7 items-center relative">
            <div className="w-7 h-7 rounded-lg bg-secondary-100" />
        </div>
        <span className="flex text-secondary-text text-base font-normal leading-5 flex-auto items-center max-w-2/3">
            <span className="ml-2 text-sm sm:text-base sm:leading-5">{placeholder}</span>
        </span>
    </>
)

export default CexPicker