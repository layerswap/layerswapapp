import { TitleElement } from "@/Models/Route";
import SuggestionsHeader from "./SuggestionsHeader";
import RouteTokenSwitch from "../RouteTokenSwitch";

type Props = {
    item: TitleElement
}
const TitleRow = ({ item }: Props) => {

    if (item.text.toLowerCase().includes("suggestions")) {
        return <SuggestionsHeader />
    }

    return (
        <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline" >
            <p>
                {item.text}
            </p>
            {
                item.text.toLowerCase().includes("all") &&
                <div className="relative ml-auto">
                    <RouteTokenSwitch />
                </div>
            }
        </div>
    );
}

export default TitleRow;