import { useField, useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    label?: string
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

        return (<>
            {label &&
                <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
                    {label}
                </label>
            }
            <div className="flex rounded-md shadow-sm mt-1.5 bg-darkblue-600 border-ouline-blue border ">
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
                        'disabled:cursor-not-allowed h-12 bg-darkblue-600 focus:ring-pink-primary focus:border-pink-primary flex-grow block w-full min-w-0 rounded-none rounded-l-md font-semibold placeholder-gray-400 border-0',
                        className
                    )}
                    onChange={onChange ? onChange : e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                    }}
                />
                {children &&
                    <span className="ml-1 inline-flex items-center">
                        {children}
                    </span>
                }
            </div>
        </>)
    });

function limitDecimalPlaces(e, count) {
    if (e.target.value.indexOf('.') == -1) { return; }
    if ((e.target.value.length - e.target.value.indexOf('.')) > count) {
        e.target.value = parseFloat(e.target.value).toFixed(count);
    }
}

function replaceComma(e) {
    var val = e.target.value;
    if (val.match(/\,/)) {
        val = val.replace(/\,/g, '.');
        e.target.value = val;
    }
}

export default NumericInput