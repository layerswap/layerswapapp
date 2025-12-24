import React, { ChangeEvent, FC, forwardRef } from "react";
import { classNames } from "@/components/utils/classNames";
import { isScientific } from "@/components/utils/RoundDecimals";

type Props = {
    value: string;
    onValueChange: (next: string) => void;

    tempValue?: string;
    disabled?: boolean;
    placeholder: string;
    minLength?: number;
    maxLength?: number;
    precision?: number;
    step?: number;
    ref?: any;
    className?: string;
};

const NumericInputControlled: FC<Props> = forwardRef<HTMLInputElement, Props>(
    function NumericInputControlled({ value, onValueChange, tempValue, disabled, placeholder, minLength, maxLength, precision, step, className, }, ref) {
        const formattedTempValue = tempValue ? isScientific(tempValue)
            ? (!isNaN(Number(tempValue))
                ? Number(tempValue).toFixed(precision ?? 0).replace(/\.?0+$/, '')
                : '')
            : tempValue?.toString()
            : '';

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            if (!/^[0-9]*[.,]?[0-9]*$/.test(e.target.value)) return;

            // normalize comma -> dot
            replaceComma(e);

            // limit decimals
            limitDecimalPlaces(e, precision);

            onValueChange(e.target.value);
        };

        // Remove pl-0 from className if it exists to allow pl-4 for $ symbol
        const inputClassName = className ? className.replace(/\bpl-0\b/g, '') : '';

        return (
            <div className="flex relative w-full">
                {Number(tempValue) > 0 && (
                    <span
                        className={classNames(
                            "py-2 flex text-secondary-text/45 items-center h-12 leading-4 bg-secondary-700 min-w-0 rounded-lg font-semibold border-0",
                            className
                        )}
                        ref={ref}
                    >
                        <span>${formattedTempValue}</span>
                    </span>
                )}

                {!tempValue && (
                    <div className="relative w-full flex items-center">
                        <span className="absolute left-0 leading-4 text-primary-text pointer-events-none text-[28px]">$</span>
                        <input
                            ref={ref}
                            value={value}
                            onChange={handleChange}
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            disabled={disabled}
                            placeholder={placeholder}
                            minLength={minLength}
                            maxLength={maxLength}
                            type="text"
                            step={step}
                            className={classNames(
                                "disabled:cursor-not-allowed h-12 leading-4 border-secondary-500 placeholder:text-secondary-text bg-secondary-700 focus:ring-primary focus:border-primary block min-w-0 rounded-lg font-semibold border-0 pl-4",
                                inputClassName
                            )}
                        />
                    </div>
                )}
            </div>
        );
    }
);

function limitDecimalPlaces(e: any, count?: number) {
    if (!count || e.target.value.indexOf(".") === -1) return;
    if (e.target.value.length - e.target.value.indexOf(".") > count) {
        e.target.value = ParseFloat(e.target.value, count);
    }
}

function ParseFloat(str: string, val: number) {
    str = str.toString();
    str = str.slice(0, str.indexOf(".") + val + 1);
    return Number(str).toString();
}

function replaceComma(e: any) {
    let val = e.target.value;
    if (val.match(/\,/)) {
        val = val.replace(/\,/g, ".");
        e.target.value = val;
    }
}

export default NumericInputControlled;
