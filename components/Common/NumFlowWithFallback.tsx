import { ComponentProps, FC, useMemo, useSyncExternalStore } from "react";
import NumberFlow from "@number-flow/react";

type NumFlowProps = ComponentProps<typeof NumberFlow>;

let _supports: boolean | null = null;
function getSupportsSnapshot() {
    if (_supports === null) {
        _supports = typeof CSS !== "undefined" && !!CSS.supports?.("line-height", "mod(1,1)");
    }
    return _supports;
}
const emptySubscribe = () => () => true;
const getServerSnapshot = () => true;

const NumFlowWithFallback: FC<NumFlowProps> = (props) => {
    const { value, format, prefix = "", suffix = "", className, ...rest } = props;
    const supportsNumberFlow = useSyncExternalStore(emptySubscribe, getSupportsSnapshot, getServerSnapshot);

    const formatted = useMemo(() => {
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        const formatter = new Intl.NumberFormat(undefined, format);
        return `${prefix}${formatter.format(numValue)}${suffix}`;
    }, [value, format, prefix, suffix]);

    if (!supportsNumberFlow) {
        return <span className={className}>{formatted}</span>;
    }

    return <NumberFlow value={value} format={format} prefix={prefix} suffix={suffix} className={className} {...rest} />;
};

export default NumFlowWithFallback;
