import { SwitchHorizontalIcon } from "@heroicons/react/outline";
import { FC, MouseEventHandler } from "react";
import SpinIcon from "./icons/spinIcon";

export interface SubmitButtonProps {
    isDisabled: boolean;
    isSubmitting: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
}

const SubmitButton: FC<SubmitButtonProps> = ({isDisabled,isSubmitting, children, type, onClick}) => {
    return (
        <button
            disabled={isDisabled || isSubmitting}
            type={type}
            onClick={onClick}
            className={controlDisabledButton(isDisabled, isSubmitting)}
        >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {(!isDisabled && !isSubmitting) &&
                    <SwitchHorizontalIcon className="h-5 w-5" aria-hidden="true" />}
                {isSubmitting ?
                    <SpinIcon className="animate-spin h-5 w-5" />
                    : null}
            </span>
            {children}
        </button>
    );
}


function controlDisabledButton(isDisabled: boolean, isSubmitting: boolean): string {
    let defaultStyles = 'group relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
    if (isDisabled|| isSubmitting) {
      defaultStyles += ' bg-gray-500 cursor-not-allowed';
    }
    else {
      defaultStyles += ' bg-gradient-to-r from-indigo-400 to-pink-400 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out'
    }
  
    return defaultStyles;
  }

export default SubmitButton;