export function SortingByOrder(x: any, y: any) {
    if (!y.isEnabled) {
        y.order += 100;
    } else if (!x.isEnabled) {
        x.order += 100;
    };
    return Number(y.isEnabled) - Number(x.isEnabled) + (Number(y.isDefault) - Number(x.isDefault) + x.order - y.order)
}
