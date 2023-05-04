import { useField, useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'

type Input = {
    label?: JSX.Element | JSX.Element[]
    pattern?: string;
    disabled?: boolean;
    placeholder: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    precision?: number;
    step?: number;
    name: string;
    className?: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

// Use with Formik
const NumericInput: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ label, pattern, disabled, placeholder, min, max, minLength, maxLength, precision, step, name, className, children, onChange }, ref) => {
        const { handleChange } = useFormikContext<SwapFormValues>();
        const [field] = useField(name)

        return <>
            {label &&
                <label htmlFor={name} className="block font-semibold text-primary-text text-sm mb-1.5">
                    {label}
                </label>
            }
            <div className="flex rounded-lg shadow-sm bg-darkblue-700 border-darkblue-500 border ">
                <input
                    {...field}
                    pattern={pattern ? pattern : "^[0-9]*[.,]?[0-9]*$"}
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={disabled}
                    placeholder={placeholder}
                    autoCorrect="off"
                    min={min}
                    max={max}
                    minLength={minLength}
                    maxLength={maxLength}
                    onInput={(event: React.ChangeEvent<HTMLInputElement>) => { replaceComma(event); limitDecimalPlaces(event, precision) }}
                    type="text"
                    step={step}
                    name={name}
                    id={name}
                    ref={ref}
                    className={classNames(
                        'disabled:cursor-not-allowed h-12 leading-4 placeholder:text-primary-text-placeholder bg-darkblue-700 focus:ring-primary focus:border-primary flex-grow block w-full min-w-0 rounded-md font-semibold border-0',
                        className
                    )}
                    onChange={onChange ? onChange : e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                    }}
                />
                {children &&
                    <span className="inline-flex items-center">
                        {children}
                    </span>
                }
            </div>
        </>;
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