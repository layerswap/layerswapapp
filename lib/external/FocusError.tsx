import React, { Fragment, useEffect } from "react";
import { getIn, FormikContextType, FormikValues } from "formik";
import flattenToLodashFormat from "./flattenToLodashFormat";

/**
 * This component focus the first error in the Formik form after the validation.
 * Note: The first is not necessary the first on the screen, it's just the first
 * key in the touched object, order is not guaranteed.
 * */

export interface FocusErrorProps {
  /**
   * Values from Formik provider.
   */
  formik: 
  FormikContextType<FormikValues>
  /**
   * Time in ms to execute the focus in the component with the error, by default 100ms.
   */
  focusDelay?: number;
  onFocus?: () => void
}

export function FocusError({
  formik: { isSubmitting, touched, isValidating, errors },
  focusDelay = 100,
  onFocus
}: FocusErrorProps) {
  useEffect(() => {
    if (!isValidating) {

      const flattedErrors = flattenToLodashFormat(errors);
      const errorNames = Object.keys(flattedErrors).reduce((prev, key) => {
        if (getIn(errors, key)) {
          prev.push(key);
        }
        return prev;
      }, [] as string[]);

      if (errorNames.length && typeof document !== "undefined") {
        let errorElement: HTMLElement | null;

        errorNames.forEach((errorKey) => {
          if (Object.keys(touched).find(x=> x == errorKey))
          {
            return
          }
          const selector = `[name="${errorKey}"]`;
          if (!errorElement) {
            errorElement = document.querySelector(selector);
            console.log(errorElement);
            return;
          }
        });

        // This is to avoid the other components autofocus when submitting
        setTimeout(() => {
          errorElement && errorElement.focus();
          onFocus && onFocus()
        }, focusDelay);
      }
    }
  }, [isSubmitting, isValidating, errors, touched, focusDelay]);

  return <Fragment />;
}
