import React, { ChangeEvent, forwardRef } from "react";
import { classNames } from "@/components/utils/classNames";
import { isScientific } from "@/components/utils/RoundDecimals";
import { sanitizeNumericInput } from "../numericInputUtils";

type Props = {
    value: string;
    onValueChange: (next: string) => void;

    tempValue?: number;
    disabled?: boolean;
    placeholder: string;
    minLength?: number;
    maxLength?: number;
    precision?: number;
    step?: number;
    className?: string;
};

const NumericInputControlled = forwardRef<HTMLInputElement, Props>(
    function NumericInputControlled({ value, onValueChange, tempValue, disabled, placeholder, minLength, maxLength, precision, step, className }, ref) {
        const formattedTempValue = tempValue ? isScientific(tempValue)
            ? (!isNaN(Number(tempValue))
                ? Number(tempValue).toFixed(precision ?? 0).replace(/\.?0+$/, '')
                : '')
            : tempValue?.toString()
            : '';

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            const sanitized = sanitizeNumericInput(e.target.value, precision);
            if (!/^[0-9]*[.,]?[0-9]*$/.test(sanitized)) return;

            onValueChange(sanitized);
        };

        // Remove pl-0 from className if it exists to allow pl-4 for $ symbol
        const inputClassName = className ? className.replace(/\bpl-0\b/g, '') : '';

        // When tempValue is set, show it as the display value, otherwise show the actual value
        const displayValue = Number(tempValue) > 0 ? formattedTempValue : value;
        
        return (
            <div className="flex relative w-full">
                <div className="relative w-full flex items-center">
                    <span className={`${tempValue ? "text-secondary-text/45" : "text-primary-text"} absolute left-0 leading-4 pointer-events-none text-[28px] group-[.exchange-amount-field]:text-xl group-[.exchange-amount-field]:pl-2`}>$</span>
                    <input
                        ref={ref}
                        value={displayValue}
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
                            "disabled:cursor-not-allowed h-12 leading-4 border-secondary-500 placeholder:text-secondary-text bg-secondary-700 focus:ring-primary focus:border-primary block min-w-0 rounded-lg font-semibold border-0 pl-4 group-[.exchange-amount-field]:pl-5",
                            Number(tempValue) > 0 ? "text-secondary-text/45" : "",
                            inputClassName
                        )}
                    />
                </div>
            </div>
        );
    }
);

export default NumericInputControlled;
