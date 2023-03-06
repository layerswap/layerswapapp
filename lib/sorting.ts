import { SelectMenuItem } from "../components/Select/selectMenuItem";

export function SortingByOrder<T>(x: SelectMenuItem<T>, y: SelectMenuItem<T>) {
    if (!y.isAvailable.value) {
        y.order += 100;
    } else if (!x.isAvailable.value) {
        x.order += 100;
    };
    return Number(y.isAvailable.value || 0) - Number(x.isAvailable.value || 0) + (Number(y.isDefault || 0) - Number(x.isDefault || 0) + x.order - y.order)
}