import { FC, useMemo } from "react";
import { SearchComponent } from "../Search";
import { RowElement } from "@/Models/Route";
import { useSettingsState } from "@/context/settings";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";

type RouteSearchProps = {
    searchQuery: string,
    setSearchQuery: (query: string) => void,
    shouldFocus: boolean,
    direction: SwapDirection;
}

const RouteSearch: FC<RouteSearchProps> = ({ searchQuery, setSearchQuery, shouldFocus, direction }) => {
    const { sourceRoutes, destinationRoutes } = useSettingsState();
    const routes = useMemo(() => direction === 'from' ? sourceRoutes : destinationRoutes, [direction, sourceRoutes, destinationRoutes]);

    const animatedPlaceholders = useMemo(() => {
        const shuffled = routes.sort(() => Math.random() - 0.5);

        const routeTexts = shuffled.map((route) => {
            const token = route.tokens[Math.floor(Math.random() * route.tokens.length)];
            return `Try "${token.symbol} ${route.display_name || route.name}"`;
        });
        return ["Search by token and network", ...routeTexts];
    }, [routes])
    
    return <div>
        <SearchComponent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isOpen={shouldFocus}
            animatedPlaceholders={animatedPlaceholders}
        />
    </div>
}

export default RouteSearch