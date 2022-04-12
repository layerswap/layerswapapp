import { SwitchHorizontalIcon } from "@heroicons/react/outline";
import { FC, MouseEventHandler } from "react";
import SpinIcon from "../icons/spinIcon";

export interface SubmitButtonProps {
    isDisabled: boolean;
    isSubmitting: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    icon: React.ReactNode;
    defaultStyle: string;
}

const SubmitButton: FC<SubmitButtonProps> = ({ isDisabled, isSubmitting, icon, children, type, onClick, defaultStyle }) => {
    return (
        <button
            disabled={isDisabled || isSubmitting}
            type={type}
            onClick={onClick}
            className={controlDisabledButton(isDisabled, isSubmitting, defaultStyle)}
        >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {(!isDisabled && !isSubmitting) &&
                    icon}
                {isSubmitting ?
                    <SpinIcon className="animate-spin h-5 w-5" />
                    : null}
            </span>
            {children}
        </button>
    );
}

function controlDisabledButton(isDisabled: boolean, isSubmitting: boolean, defaultStyle: string): string {
    let defaultStyles = 'group relative w-full flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';
    if (isDisabled || isSubmitting) {
        defaultStyles += ' bg-gray-500 cursor-not-allowed';
    }
    else {
        defaultStyles += " " + defaultStyle + ' shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out'
    }

    return defaultStyles;
}

export default SubmitButton;