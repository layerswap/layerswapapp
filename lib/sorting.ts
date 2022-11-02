import { SelectMenuItem } from "../components/Select/selectMenuItem";

export function SortingByOrder<T>(x: SelectMenuItem<T>, y: SelectMenuItem<T>) {
    if (!y.isAvailable) {
        y.order += 100;
    } else if (!x.isAvailable) {
        x.order += 100;
    };
    return Number(y.isAvailable || 0) - Number(x.isAvailable || 0) + (Number(y.isDefault || 0) - Number(x.isDefault || 0) + x.order - y.order)
}