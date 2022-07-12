import { FC, MouseEventHandler } from "react";
import SpinIcon from "../icons/spinIcon";

export class SubmitButtonProps {
    isDisabled: boolean;
    isSubmitting: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    icon: React.ReactNode;
    buttonStyle?: 'outline' | 'filled' = 'filled';
}

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const SubmitButton: FC<SubmitButtonProps> = ({ isDisabled, isSubmitting, icon, children, type, onClick, buttonStyle = 'filled'}) => {
    return (
        <button
            disabled={isDisabled || isSubmitting}
            type={type}
            onClick={onClick}
            className={classNames(buttonStyle == 'filled' ? "border-0 bg-pink-primary" : "text-pink-primary border border-pink-primary" ,"shadowed-button shadowed-button disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed relative w-full flex justify-center py-3 px-4 font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out")} 
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

export default SubmitButton;