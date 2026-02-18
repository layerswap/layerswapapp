import { useField, useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { classNames } from '@/components/utils/classNames'
import { isScientific } from "@/components/utils/RoundDecimals";

type Input = {
    tempValue?: number;
    label?: JSX.Element | JSX.Element[]
    disabled?: boolean;
    placeholder: string;
    minLength?: number;
    maxLength?: number;
    precision?: number;
    step?: number;
    name: string;
    className?: string;
    children?: JSX.Element | JSX.Element[] | null;
    ref?: any;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    onBlur?: () => void;
}

// Use with Formik
const NumericInput: FC<Input> = forwardRef<HTMLInputElement, Input>(
    function NumericInput({ label, disabled, tempValue, placeholder, minLength, maxLength, precision, step, name, className, children, onChange, onFocus, onBlur }, ref) {
        const { handleChange } = useFormikContext<SwapFormValues>();
        const [field] = useField(name)

        const formattedTempValue = Number(tempValue) >= 0 ? isScientific(tempValue)
            ? (!isNaN(Number(tempValue))
                ? Number(tempValue).toFixed(precision ?? 0).replace(/\.?0+$/, '')
                : '')
            : tempValue?.toString()
            : '';
            
        return <div>
            {label &&
                <label htmlFor={name} className="block font-semibold text-secondary-text text-sm mb-1.5 w-full">
                    {label}
                </label>
            }
            <div className="flex relative w-full">
                {
                    !isNaN(Number(tempValue)) &&
                    <span className={classNames(
                        'py-2 flex text-secondary-text/45 items-center h-12 leading-4 bg-secondary-700 min-w-0 rounded-lg font-semibold border-0 ',
                        className
                    )}
                        ref={ref}
                    >
                        <span>{formattedTempValue}</span>
                    </span>
                }
                {
                    isNaN(Number(tempValue)) &&
                    <input
                        {...field}
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={disabled}
                        placeholder={placeholder}
                        autoCorrect="off"
                        minLength={minLength}
                        maxLength={maxLength}
                        onInput={(event: React.ChangeEvent<HTMLInputElement>) => { replaceComma(event); limitDecimalPlaces(event, precision) }}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        type="text"
                        step={step}
                        name={name}
                        id={name}
                        ref={ref}
                        className={classNames(
                            'disabled:cursor-not-allowed h-12 leading-4 border-secondary-500 placeholder:text-secondary-text bg-secondary-700 focus:ring-primary focus:border-primary block min-w-0 rounded-lg font-semibold border-0',
                            className
                        )}
                        onChange={onChange ? onChange : e => {
                            /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        }}
                    />}
                {<>{children}</>}
            </div>
        </div>;
    });

function limitDecimalPlaces(e, count) {
    if (e.target.value.indexOf('.') == -1) { return; }
    if ((e.target.value.length - e.target.value.indexOf('.')) > count) {
        e.target.value = ParseFloat(e.target.value, count);
    }
}

function ParseFloat(str, val) {
    str = str.toString();
    str = str.slice(0, (str.indexOf(".")) + val + 1);
    return Number(str);
}

function replaceComma(e) {
    var val = e.target.value;
    if (val.match(/\,/)) {
        val = val.replace(/\,/g, '.');
        e.target.value = val;
    }
}

export default NumericInput