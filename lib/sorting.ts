import { SelectMenuItem } from "../components/Select/Shared/Props/selectMenuItem";

export function SortingByOrder<T>(x: SelectMenuItem<T>, y: SelectMenuItem<T>) {
    if (!y.isAvailable.value) {
        y.order += 100;
    } else if (!x.isAvailable.value) {
        x.order += 100;
    };
    return Number(y.isAvailable.value || 0) - Number(x.isAvailable.value || 0) + (x.order - y.order)
}

export function SortingByAvailability<T>(x: SelectMenuItem<T>, y: SelectMenuItem<T>) {
    const reasonA = x.isAvailable && x.isAvailable.disabledReason;
    const reasonB = y.isAvailable && y.isAvailable.disabledReason;

    if (reasonA && !reasonB) {
        return 1;
    } else if (!reasonA && reasonB) {
        return -1;
    }

    return 0;
}