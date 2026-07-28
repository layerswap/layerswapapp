import { AnimatedNumber } from '@/lib/AnimatedNumber';
import { FC, useMemo } from 'react';

type AnimatedValueProps = {
    value: string | number | null | undefined;
    className?: string;
};

const isNumeric = (val: string | number | null | undefined): val is number =>
    typeof val === 'number' || (!!val && !isNaN(Number(val)));

export const AnimatedValue: FC<AnimatedValueProps> = ({ value, className }) => {
    const display = useMemo(() => {
        if (value === null || value === undefined) return 0;
        return value;
    }, [value]);

    const numericOnly = isNumeric(display);

    return (
        <span className={`relative inline-block min-w-[5ch] ${className}`}>
            {numericOnly ? (
                <AnimatedNumber value={Number(display)} />
            ) : (
                <span>{display}</span>
            )}
        </span>
    );
};
