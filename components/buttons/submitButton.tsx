import { FC, MouseEventHandler } from "react";
import SpinIcon from "../icons/spinIcon";

type buttonStyle = 'outline' | 'filled';
type buttonSize = 'small' | 'medium' | 'large';

export class SubmitButtonProps {
    isDisabled: boolean;
    isSubmitting: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    icon: React.ReactNode;
    buttonStyle?: buttonStyle = 'filled';
    size?: buttonSize = 'medium'
}

function constructClassNames(size: buttonSize, buttonStyle: buttonStyle) {
    let defaultStyle = 'shadowed-button disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-md shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out'
    defaultStyle += buttonStyle == 'filled' ? " border-0 bg-pink-primary" : " text-pink-primary border border-pink-primary";

    switch (size) {
        case 'large':
            defaultStyle += " py-4 px-4";
            break;
        case 'medium':
            defaultStyle += " py-3 px-4";
            break;
        case 'small':
            defaultStyle += " py-1 px-4";
            break;
    }

    return defaultStyle;
}

const SubmitButton: FC<SubmitButtonProps> = ({ isDisabled, isSubmitting, icon, children, type, onClick, buttonStyle = 'filled', size = 'medium' }) => {
    return (
        <button
            disabled={isDisabled || isSubmitting}
            type={type}
            onClick={onClick}
            className={constructClassNames(size, buttonStyle)}
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