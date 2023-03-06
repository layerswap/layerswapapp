import { SelectMenuItem } from "../components/Select/selectMenuItem";

export function SortingByOrder<T>(x: SelectMenuItem<T>, y: SelectMenuItem<T>) {
    if (!y.isAvailable.available) {
        y.order += 100;
    } else if (!x.isAvailable.available) {
        x.order += 100;
    };
    return Number(y.isAvailable.available || 0) - Number(x.isAvailable.available || 0) + (Number(y.isDefault || 0) - Number(x.isDefault || 0) + x.order - y.order)
}