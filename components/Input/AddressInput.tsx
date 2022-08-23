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
                <label htmlFor={name} className="block font-normal text-pink-primary-300 text-sm">
                    {label}
                </label>
            }
            <div className="flex rounded-md shadow-sm mt-1.5 bg-darkblue-600">
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
                            className={classNames('disabled:cursor-not-allowed h-12 leading-4 focus:ring-pink-primary focus:border-pink-primary block font-semibold w-full bg-darkblue-600 border-ouline-blue border rounded-md placeholder-gray-400 truncate',
                                className
                            )}
                        />
                    )}
                </Field>
            </div>
        </>)
    });

export default AddressInput