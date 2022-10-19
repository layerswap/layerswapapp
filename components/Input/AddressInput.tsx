import { Field, useField } from "formik";
import { ChangeEvent, FC, forwardRef } from "react";
import { classNames } from '../utils/classNames'

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    label?: string
    disabled: boolean;
    name: string;
    className?: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

const AddressInput: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ label, disabled, name, className, onChange }, ref) => {

        return (<>
            {label &&
                <label htmlFor={name} className="block font-normal text-primary-text text-sm">
                    {label}
                </label>
            }
            <div className="flex rounded-md shadow-sm mt-1.5 bg-darkblue-700">
                <Field name={name}>
                    {({ field }) => (
                        <input
                            {...field}
                            ref={ref}
                            placeholder={"0x123...ab56c"}
                            autoCorrect="off"
                            type={"text"}
                            name={name}
                            id={name}
                            disabled={disabled}
                            className={classNames('disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-700 border-darkblue-500 border rounded-md placeholder-gray-400 truncate focus-peer:ring-primary focus-peer:border-darkblue-500 focus-peer:border focus-peer:ring-1 focus:outline-none',
                                className
                            )}
                        />
                    )}
                </Field>
            </div>
        </>)
    });

export default AddressInput