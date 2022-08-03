import { Field, useField } from "formik";
import { ChangeEvent, FC, forwardRef, useCallback, useState } from "react";
import { classNames } from '../classNames'
import { debounce } from "lodash";
const { default: Resolution } = require('@unstoppabledomains/resolution');

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

        const [field, meta, helpers] = useField(name)
        const [value, setValue] = useState("")

        const udResolution = new Resolution();
        const supportedUDDomains = [".zil", ".crypto", ".nft", ".blockchain", ".bitcoin", "coin", "wallet", ".888", ".dao", ".x"]

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            debouncedDomainLookup(e.target.value)
            setValue(e.target.value)
        }

        const debouncedDomainLookup = useCallback(debounce((value: any) => {
            if (supportedUDDomains.some(postfix => value.endsWith(postfix))) {
                // try resolve ud domain
                udResolution.addr(value, "ETH")
                  .then((address) => setValue(address))
                  .catch(e => {
                      console.warn("Failed to resolve a possible UD domain", e)
                  });
            }
        }, 1000), [])

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
                            value={value}
                            onChange={handleChange}
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