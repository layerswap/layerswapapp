import { TitleElement } from "@/Models/Route";
import SuggestionsHeader from "./SuggestionsHeader";
import RouteTokenSwitch from "../RouteTokenSwitch";
import RouteSortingMenu from "../RouteSortingMenu";

type Props = {
    item: TitleElement
}
const TitleRow = ({ item }: Props) => {

    if (item.text.toLowerCase().includes("suggestions")) {
        return <SuggestionsHeader />
    }

    return (
        <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline" >
            <div className="flex items-center gap-1">
                <p>
                    {item.text}
                </p>
                {
                    item.text.toLowerCase().includes("all") &&
                    <RouteSortingMenu />
                }
            </div>
            {
                item.text.toLowerCase().includes("all") &&
                <div className="relative ml-auto flex items-center gap-2">
                    <RouteTokenSwitch />
                </div>
            }
        </div>
    );
}

export default TitleRow;