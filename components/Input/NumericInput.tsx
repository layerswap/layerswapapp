import { useField } from "formik";
import { FC, forwardRef } from "react";
import { classNames } from '../classNames'

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as'> {
    label?: string
    disabled: boolean;
    placeholder: string;
    min: number;
    max: number;
    step: number;
    name: string;
    className?: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    onChange: (e: any) => void;
    onInput?: (e: any) => void
}

const NumericInput: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ label, disabled, placeholder, min, max, step, name, className, children, onInput, onChange }, ref) => {

        const [field, meta, helpers] = useField(name)

        return (<>
            {label &&
                <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
                    {label}
                </label>
            }
            <div className="flex rounded-md shadow-sm mt-1.5 bg-darkblue-600 border-ouline-blue border ">
                <input
                    {...field}
                    pattern="^[0-9]*[.,]?[0-9]*$"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={disabled}
                    placeholder={placeholder}
                    autoCorrect="off"
                    min={min}
                    max={max}
                    onInput={() => onInput}
                    type="text"
                    step={step}
                    name={name}
                    id={name}
                    ref={ref}
                    className={classNames(
                        'disabled:cursor-not-allowed h-12 bg-darkblue-600 focus:ring-pink-primary focus:border-pink-primary flex-grow block w-full min-w-0 rounded-none rounded-l-md sm:text-sm font-semibold placeholder-gray-400 border-0',
                        className
                    )}
                    onChange={onChange}
                />
                {children &&
                    <span className="ml-1 inline-flex items-center">
                        {children}
                    </span>
                }
            </div>
        </>)
    });

export default NumericInput