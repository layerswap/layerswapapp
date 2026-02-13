import { useField, useFormikContext } from "formik";
import { ChangeEvent, forwardRef } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { classNames } from '@/components/utils/classNames'
import { isScientific } from "@/components/utils/RoundDecimals";
import {
  sanitizeNumericInput,
} from "./numericInputUtils";

type Input = {
  tempValue?: number;
  label?: JSX.Element | JSX.Element[];
  disabled?: boolean;
  placeholder: string;
  minLength?: number;
  maxLength?: number;
  precision?: number;
  step?: number;
  name: string;
  className?: string;
  children?: JSX.Element | JSX.Element[] | null;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

const NUMERIC_REGEX = /^[0-9]*[.,]?[0-9]*$/;

// Use with Formik
const NumericInput = forwardRef<
  HTMLInputElement | HTMLSpanElement,
  Input
>(function NumericInput(
  {
    label,
    disabled,
    tempValue,
    placeholder,
    minLength,
    maxLength,
    precision,
    name,
    className,
    children,
    onChange,
    onFocus,
    onBlur,
  },
  ref
) {
  const { handleChange } = useFormikContext<SwapFormValues>();
  const [field] = useField(name);

  const formattedTempValue =
    Number(tempValue) >= 0
      ? isScientific(tempValue)
        ? !isNaN(Number(tempValue))
          ? Number(tempValue).toFixed(precision ?? 0).replace(/\.?0+$/, "")
          : ""
        : tempValue?.toString()
      : "";

  const showReadOnly = !isNaN(Number(tempValue));

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericInput(e.target.value, precision);
    if (!NUMERIC_REGEX.test(sanitized)) return;

    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: sanitized },
    } as ChangeEvent<HTMLInputElement>;

    if (onChange) {
      onChange(syntheticEvent);
    } else {
      handleChange(syntheticEvent);
    }
  };

  return (
    <div>
      {label && showReadOnly === false && (
        <label
          htmlFor={name}
          className="block font-semibold text-secondary-text text-sm mb-1.5 w-full"
        >
          {label}
        </label>
      )}
      <div className="flex relative w-full">
        {showReadOnly ? (
          <span
            ref={ref as React.Ref<HTMLSpanElement>}
            className={classNames(
              "py-2 flex text-secondary-text/45 items-center h-12 leading-4 bg-secondary-700 min-w-0 rounded-lg font-semibold border-0 ",
              className
            )}
          >
            <span>{formattedTempValue}</span>
          </span>
        ) : (
          <input
            {...field}
            ref={ref as React.Ref<HTMLInputElement>}
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            autoCorrect="off"
            minLength={minLength}
            maxLength={maxLength}
            onFocus={onFocus}
            onBlur={onBlur}
            type="text"
            name={name}
            id={name}
            className={classNames(
              "disabled:cursor-not-allowed h-12 leading-4 border-secondary-500 placeholder:text-secondary-text bg-secondary-700 focus:ring-primary focus:border-primary block min-w-0 rounded-lg font-semibold border-0",
              className
            )}
            onChange={handleInputChange}
          />
        )}
        {children}
      </div>
    </div>
  );
});

export default NumericInput;
